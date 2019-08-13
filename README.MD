# SponsorBlock Server

SponsorBlock is an extension that will skip over sponsored segments of YouTube videos. SponsorBlock is a crowdsourced browser extension that let's anyone submit the start and end time's of sponsored segments of YouTube videos. Once one person submits this information, everyone else with this extension will skip right over the sponsored segment.

This is the server backend for it

# Server

This is a simple Sqlite database that will hold all the timing data.

To make sure that this project doesn't die, I have made the database publicly downloadable at https://sponsor.ajay.app/database.db. So, you can download a backup or get archive.org to take a backup if you do desire.

Hopefully this project can be combined with projects like [this](https://github.com/Sponsoff/sponsorship_remover) and use this data to create a neural network to predict when sponsored segments happen. That project is sadly abandoned now, so I have decided to attempt to revive this idea.

# Client

The client web browser extension is available here: https://github.com/ajayyy/SponsorBlock

# API Docs

Public API available at https://sponsor.ajay.app.

________________________________________________________________________________

**GET** `/api/getVideoSponsorTimes`

**Input**:
```
{
  videoID: string
}
```

**Response**:
```
{
  sponorTimes: array [float],
  UUIDs: array [string] //The ID for this sponsor time, used to submit votes
}
```

**Error codes**:

404: Not Found

__________________________________________________________________

**GET** `/api/postVideoSponsorTimes`

**Input**:
```
{
  videoID: string,
  startTime: float,
  endTime: float,
  userID: string //This should be a randomly generated UUID
}
```

**Response**:
```
{
  Nothing (status code 200)
}
```

**Error codes**:

400: Bad Request (Your inputs are wrong/impossible)

429: Rate Limit (Too many for the same user or IP)

409: Duplicate

__________________________________________________________________

**GET** `/api/voteOnSponsorTime`

**Input**:
```
{
  UUID: string, //id of the sponsor being voted on
  userID: string,
  type: int //0 for downvote, 1 for upvote
}
```

**Response**:
```
{
  Nothing (status code 200)
}
```

**Error codes**:

400: Bad Request (Your inputs are wrong/impossible)

405: Duplicate

__________________________________________________________________

**GET** `/api/viewedVideoSponsorTime`

**Input**:
```
{
  UUID: string
}
```

**Response**:
```
{
  Nothing (status code 200)
}
```

**Error codes**:

400: Bad Request (Your inputs are wrong/impossible)

__________________________________________________________________

**GET** `/api/getViewsForUser`

**Input**:
```
{
  userID: string
}
```

**Response**:
```
{
  viewCount: int
}
```

**Error codes**:

404: Not Found

__________________________________________________________________

**POST** `/api/setUsername`

**Input**:
```
{
  userID: string,
  userName: string
}
```

**Response**:
```
{
  Nothing (status code 200)
}
```

**Error codes**:

400: Bad Request (Your inputs are wrong/impossible)

__________________________________________________________________

**POST** `/api/getUsername`

**Input**:
```
{
  userID: string
}
```

**Response**:
```
{
  userName: string //will send back hashed userID if no username has been set
}
```

**Error codes**:

400: Bad Request (Your inputs are wrong/impossible)

__________________________________________________________________

### Stats Calls

**GET** `/api/getTopUsers`

**Input**:
```
{
  sortType: int //0 for by minutes saved, 1 for by view count, 2 for by total submissions
}
```

**Response**:
```
{
  userNames: array [string],
  viewCounts: array [int],
  totalSubmissions: array [int],
  minutesSaved: array [float]
}
```

**Error codes**:

400: Bad Request (Your inputs are wrong/impossible)

__________________________________________________________________

**GET** `/api/getTotalStats`

**Input**:
```
{
  Nothing
}
```

**Response**:
```
{
  userCount: int,
  viewCount: int,
  totalSubmissions: int,
  minutesSaved: float
}
```

**Error codes**:

None
