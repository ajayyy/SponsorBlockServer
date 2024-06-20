# Public

- [vipUsers](#vipusers)
- [sponsorTimes](#sponsortimes)
- [userNames](#usernames)
- [categoryVotes](#categoryvotes)
- [lockCategories](#lockcategories)
- [warnings](#warnings)
- [shadowBannedUsers](#shadowbannedusers)
- [videoInfo](#videoinfo)
- [unlistedVideos](#unlistedvideos)
- [config](#config)
- [archivedSponsorTimes](#archivedsponsortimes)
- [ratings](#ratings)
- [userFeatures](#userFeatures)
- [titles](#titles)
- [titleVotes](#titleVotes)
- [thumbnails](#thumbnails)
- [thumbnailVotes](#thumbnailVotes)

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
| description | TEXT | not null, default '' |

| index | field |
| -- | :--: |
| sponsorTime_timeSubmitted | timeSubmitted |
| sponsorTime_userID | userID |
| sponsorTimes_UUID | UUID |
| sponsorTimes_hashedVideoID | service, hashedVideoID, startTime |
| sponsorTimes_videoID | service, videoID, startTime |
| sponsorTimes_videoID_category | videoID, category |
| sponsorTimes_description_gin | description, category |

### userNames

| Name | Type | |
| -- | :--: | -- |
| userID | TEXT | not null |
| userName | TEXT | not null |
| locked | INTEGER | not nul, default '0' |

| index | field |
| -- | :--: |
| userNames_userID | userID |

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
| actionType | TEXT | not null, default 'skip' |
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
| warnings_index | userID, issueTime, enabled |
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

| index | field |
| -- | :--: |
| videoInfo_videoID | videoID |
| videoInfo_channelID | channelID |

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

### ratings  

| Name | Type | |
| -- | :--: | -- |
| videoID | TEXT | not null |
| service | TEXT | not null, default 'YouTube' |
| type | INTEGER | not null |
| count | INTEGER | not null |
| hashedVideoID | TEXT | not null |

| index | field |
| -- | :--: |
| ratings_hashedVideoID_gin | hashedVideoID |
| ratings_hashedVideoID | hashedVideoID, service |
| ratings_videoID | videoID, service |

### userFeatures

| index | field |
| -- | :--: |
| userFeatures_userID | userID, feature |

### titles

| index | field |
| -- | :--: |
| titles_timeSubmitted | timeSubmitted |
| titles_userID_timeSubmitted | videoID, service, userID, timeSubmitted |
| titles_videoID | videoID, service |
| titles_hashedVideoID_2 | service, hashedVideoID, timeSubmitted |

### titleVotes
| index | field |
| -- | :--: |
| titleVotes_votes | UUID, votes

### thumbnails
| index | field |
| -- | :--: |
| thumbnails_timeSubmitted | timeSubmitted |
| thumbnails_votes_timeSubmitted | videoID, service, userID, timeSubmitted |
| thumbnails_videoID | videoID, service |
| thumbnails_hashedVideoID_2 | service, hashedVideoID, timeSubmitted |

### thumbnailVotes
| index | field |
| -- | :--: |
| thumbnailVotes_votes | UUID, votes

# Private 

- [votes](#votes)
- [categoryVotes](#categoryVotes)
- [sponsorTimes](#sponsorTimes)
- [config](#config)
- [ratings](#ratings)
- [tempVipLog](#tempVipLog)
- [userNameLogs](#userNameLogs)

### votes

| Name | Type | |
| -- | :--: | -- |
| UUID | TEXT | not null |
| userID | TEXT | not null |
| hashedIP | TEXT | not null |
| type | INTEGER | not null |
| originalVoteType | INTEGER | not null | # Since type was reused to also specify the number of votes removed when less than 0, this is being used for the actual type

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
| categoryVotes_UUID | UUID, userID, hashedIP, category |

### sponsorTimes  

| Name | Type | |
| -- | :--: | -- |
| videoID | TEXT | not null |
| hashedIP | TEXT | not null |
| timeSubmitted | INTEGER | not null |
| service | TEXT | not null, default 'YouTube' |

| index | field |
| -- | :--: |
| privateDB_sponsorTimes_v4 | videoID, service, timeSubmitted |

### config  

| Name | Type | |
| -- | :--: | -- |
| key | TEXT | not null |
| value | TEXT | not null |

### ratings  

| Name | Type | |
| -- | :--: | -- |
| videoID | TEXT | not null |
| service | TEXT | not null, default 'YouTube' |
| userID | TEXT | not null |
| type | INTEGER | not null |
| timeSubmitted | INTEGER | not null |
| hashedIP | TEXT | not null |

| index | field |
| -- | :--: |
| ratings_videoID | videoID, service, userID, timeSubmitted |

### tempVipLog
| Name | Type | |
| -- | :--: | -- |
| issuerUserID | TEXT | not null |
| targetUserID | TEXT | not null |
| enabled | BOOLEAN | not null |
| updatedAt | INTEGER | not null |

### userNameLogs

| Name | Type | |
| -- | :--: | -- |
| userID | TEXT | not null |
| newUserName | TEXT | not null |
| oldUserName | TEXT | not null |
| updatedByAdmin | BOOLEAN | not null |
| updatedAt | INTEGER | not null |