GET /api/searchSegments
Input: (URL Params, translated 1-1 to JSON)
```ts
{
  // same as skipSegments
  videoID: string,

  category: string
  categories: string[]

  actionType: string
  actionTypes: string[]

  service: string
  // end skipSegments

  page: int // page to start from (default 0)

  minVotes: int // default -2, vote threshold, inclusive
  maxVotes: int // default infinite, vote threshold, inclusive

  minViews: int // default 0 - view threshold, inclusive
  maxViews: int // default infinite - view threshold, inclusive

  locked: boolean // default true - if false, dont't show segments that are locked
  hidden: boolean // default true - if false, don't show segment that are hidden/ shadowhidden
  ignored: boolean // default true - if false, don't show segments that are hidden or below vote threshold
}
```

Response: (JSON)
```ts
  segmentCount: int, // total number of segements matching query
  page: int, // page number
  segments: [{ // array of this object, max 10
    UUID: string,
    timeSubmitted: int, // time submitted
    startTime: int, // start time in seconds
    endTime: int, // end time in seconds
    category: string, // category of segment
    actionType: string, // action type of segment
    votes: int, // number of votes
    views: int // number of views
    locked: int, // locked
    hidden: int, // hidden
    shadowHidden: int, // shadowHidden
  }]
```