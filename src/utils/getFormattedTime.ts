/**
 * Converts time in seconds to minutes:seconds
 */
export function getFormattedTime(totalSeconds: number): string {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds - minutes * 60;
    let secondsDisplay = seconds.toFixed(3);
    if (seconds < 10) {
        //add a zero
        secondsDisplay = '0' + secondsDisplay;
    }

    return minutes + ':' + secondsDisplay;
}
