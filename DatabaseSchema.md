# SponsorTimesDB

[vipUsers](#vipUsers)  
[sponsorTimes](#sponsorTimes)  
[userNames](#userNames)  
[userNameLogs](#userNameLogs)  
[categoryVotes](#categoryVotes)  
[lockCategories](#lockCategories)  
[warnings](#warnings)  
[shadowBannedUsers](#shadowBannedUsers)  
[unlistedVideos](#unlistedVideos)  
[config](#config)  
[archivedSponsorTimes](#archivedSponsorTimes)

### vipUsers
| Name | Type | |
| -- | :--: | -- |
| userID | TEXT | not null |

| index | field |
| -- | :--: |
| vipUsers_index | userID |

### sponsorTimes  

| Name | Type | |
| -- | :--: | -- |
| videoID | TEXT | not null |
| startTime | REAL | not null |
| endTime | REAL | not null |
| votes | INTEGER | not null |
| locked | INTEGER | not null, default '0' |
| incorrectVotes | INTEGER | not null, default 1 |
| UUID | TEXT | not null, unique |
| userID | TEXT | not null |
| timeSubmitted | INTEGER | not null |
| views | INTEGER | not null |
| category | TEXT | not null, default 'sponsor' |
| actionType | TEXT | not null, default 'skip' |
| service | TEXT | not null, default 'YouTube' |
| videoDuration | INTEGER | not null, default '0' |
| hidden | INTEGER | not null, default '0' |
| reputation | REAL | not null, default '0' |
| shadowHidden | INTEGER | not null |
| hashedVideoID | TEXT | not null, default '', sha256 |
| userAgent | TEXT | not null, default '' |

| index | field |
| -- | :--: |
| sponsorTime_timeSubmitted | timeSubmitted |
| sponsorTime_userID | userID |
| sponsorTimes_UUID | UUID |
| sponsorTimes_hashedVideoID_gin| hashedVideoID, category |
| sponsorTimes_videoID | videoID, service, category, timeSubmitted |

### userNames

| Name | Type | |
| -- | :--: | -- |
| userID | TEXT | not null |
| userName | TEXT | not null |
| locked | INTEGER | not nul, default '0' |

| index | field |
| -- | :--: |
| userNames_userID | userID |

### userNameLogs

| Name | Type | |
| -- | :--: | -- |
| userID | TEXT | not null |
| newUserName | TEXT | not null |
| oldUserName | TEXT | not null |
| updatedByAdmin | BOOLEAN | not null |
| updatedAt | INTEGER | not null |

### categoryVotes

| Name | Type | |
| -- | :--: | -- |
| UUID | TEXT | not null |
| category | TEXT | not null |
| votes | INTEGER | not null, default 0 |

| index | field |
| -- | :--: |
| categoryVotes_UUID_public | UUID, category |

### lockCategories  

| Name | Type | |
| -- | :--: | -- |
| videoID | TEXT | not null |
| userID | TEXT | not null |
| category | TEXT | not null |
| hashedVideoID | TEXT | not null, default '' |
| reason | TEXT | not null, default '' |
| service | TEXT | not null, default 'YouTube' |

| index | field |
| -- | :--: |
| lockCategories_videoID | videoID, service, category |

### warnings  

| Name | Type | |
| -- | :--: | -- |
| userID | TEXT | not null |
| issueTime | INTEGER | not null |
| issuerUserID | TEXT | not null |
| enabled | INTEGER | not null |
| reason | TEXT | not null, default '' |

| index | field |
| -- | :--: |
| warnings_index | userID |
| warnings_issueTime | issueTime |

### shadowBannedUsers  

| Name | Type | |
| -- | :--: | -- |
| userID | TEXT | not null |

| index | field |
| -- | :--: |
| shadowBannedUsers_index | userID |

### videoInfo  

| Name | Type | |
| -- | :--: | -- |
| videoID | TEXT | not null |
| channelID | TEXT | not null |
| title | TEXT | not null |
| published | REAL | not null |
| genreUrl | TEXT | not null |

| index | field |
| -- | :--: |
| videoInfo_videoID | timeSubmitted |
| videoInfo_channelID | userID |

### unlistedVideos  

| Name | Type | |
| -- | :--: | -- |
| videoID | TEXT | not null |
| year | TEXT | not null |
| views | TEXT | not null |
| channelID | TEXT | not null |
| timeSubmitted | INTEGER | not null |
| service | TEXT | not null, default 'YouTube' |

### config

| Name | Type | |
| -- | :--: | -- |
| key | TEXT | not null, unique |
| value | TEXT | not null |

### archivedSponsorTimes

| Name | Type | |
| -- | :--: | -- |
| videoID | TEXT | not null |
| startTime | REAL | not null |
| endTime | REAL | not null |
| votes | INTEGER | not null |
| locked | INTEGER | not null, default '0' |
| incorrectVotes | INTEGER | not null, default 1 |
| UUID | TEXT | not null, unique |
| userID | TEXT | not null |
| timeSubmitted | INTEGER | not null |
| views | INTEGER | not null |
| category | TEXT | not null, default 'sponsor' |
| actionType | TEXT | not null, default 'skip' |
| service | TEXT | not null, default 'YouTube' |
| videoDuration | INTEGER | not null, default '0' |
| hidden | INTEGER | not null, default '0' |
| reputation | REAL | not null, default '0' |
| shadowHidden | INTEGER | not null |
| hashedVideoID | TEXT | not null, default '', sha256 |
| userAgent | TEXT | not null, default '' |

# Private 

[vote](#vote)  
[categoryVotes](#categoryVotes)  
[sponsorTimes](#sponsorTimes)  
[config](#config)  

### vote

| Name | Type | |
| -- | :--: | -- |
| UUID | TEXT | not null |
| userID | TEXT | not null |
| hashedIP | TEXT | not null |
| type | INTEGER | not null |

| index | field |
| -- | :--: |
| votes_userID | UUID |

### categoryVotes

| Name | Type | |
| -- | :--: | -- |
| UUID | TEXT | not null |
| userID | TEXT | not null |
| hashedIP | TEXT | not null |
| category | TEXT | not null |
| timeSubmitted | INTEGER | not null |

| index | field |
| -- | :--: |
| categoryVotes_UUID | UUID, userID, hasedIP, category |

### sponsorTimes  

| Name | Type | |
| -- | :--: | -- |
| videoID | TEXT | not null |
| hashedIP | TEXT | not null |
| timeSubmitted | INTEGER | not null |
| service | TEXT | not null, default 'YouTube' |

| index | field |
| -- | :--: |
| sponsorTimes_hashedIP | hashedIP |
| privateDB_sponsorTimes_videoID_v2 | videoID, service |

### config  

| Name | Type | |
| -- | :--: | -- |
| key | TEXT | not null |
| value | TEXT | not null |