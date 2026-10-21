export interface HistogramOptions {
    /**
     * The threshold for the last bucket, required
     */
    maxBucket: number;
    /**
     * The threshold for the first bucket, defaults to 1
     *
     * Must be >0
     */
    minBucket?: number;
}

export interface EmitMetricsOptions {
    /**
     * The basename of the histogram metric
     */
    baseName: string;
    /**
     * Extra labels to attach to the metrics
     */
    labels?: Record<string, string>;
}

export class Histogram {
    private minBucket: number;
    private storage: number[];
    /**
     * An object that maps bucket lower bounds to values in private histogram storage
     *
     * Keys are powers of 2 + "+Inf" for the "infinity bucket"/"total count submetric"
     */
    public readonly buckets: Record<string, number>;
    private sum: number;

    constructor({
        maxBucket,
        minBucket = 1,
    }: HistogramOptions) {
        this.minBucket = minBucket;
        const numBuckets = Math.ceil(Math.log2(maxBucket / minBucket)) + 2; // log2 + <1ms bucket + <Infinity bucket

        // initialize the storage array with zeros
        this.storage = Array.from({ length: numBuckets }, () => 0);
        this.sum = 0;

        // generate the "buckets" access object
        const buckets: Record<string, number> = {};

        let max = minBucket;
        for (let i = 0; i < numBuckets-1; i++) {
            // rebind to a new const, otherwise all props will return the last bucket
            const storageIndex = i;
            Object.defineProperty(buckets, `${max}`, {
                enumerable: true,
                get: () => this.storage[storageIndex],
            });
            max *= 2;
        }
        Object.defineProperty(buckets, "+Inf", {
            enumerable: true,
            get: () => this.storage[numBuckets-1],
        });

        this.buckets = buckets;
    }

    public getSum(): number {
        return this.sum;
    }

    public getCount(): number {
        return this.buckets["+Inf"];
    }

    /**
     * Log an observation
     *
     * Increments appropriate buckets and adds this value to the sum.
     * @param observation the observed value
     */
    public observe(observation: number) {
        this.sum += observation;

        // find the appropriate bucket
        let max = this.minBucket;
        let smallestBucket;
        for (smallestBucket = 0; smallestBucket < this.storage.length-1; smallestBucket++) {
            if (observation <= max) {
                break;
            }
            max *= 2;
        }
        // fun fact: if the break branch is not reached, i will be equal to this.storage.length-1 here
        //           which corresponds to the +Inf bucket - everything works out
        //
        // increment every bucket after the smallest matching found
        for (let i = smallestBucket; i < this.storage.length; i++) {
            this.storage[i]++;
        }
    }

    public emitMetrics({
        baseName,
        labels = {},
    }: EmitMetricsOptions): string[] {
        return [
            `${baseName}_sum${serializeLabels(labels)} ${this.getSum()}`,
            `${baseName}_count${serializeLabels(labels)} ${this.getCount()}`,
            ...Object.entries(this.buckets).map(([bucket, value]) => `${baseName}_bucket${serializeLabels({ ...labels, le: bucket })} ${value}`),
        ];
    }
}

/**
 * Serializes a set of labels into the format for prometheus.
 *
 * Makes no attempt to escape the names/values. Do not use quotation marks in names or values.
 * @param labels map of label name -> value to serialize
 */
export function serializeLabels(labels: Record<string, string>): string {
    const labelEntries = Object.entries(labels);
    if (labelEntries.length === 0) return "";
    return `{${labelEntries.map(([key, value]) => `${key}="${value}"`).join(", ")}}`;
}
