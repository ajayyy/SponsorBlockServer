mkdir ./dump

pg_dump -f ./dump/sponsorTimes.dump sponsorTimes
pg_dump -f ./dump/privateDB.dump privateDB

restic backup ./dump