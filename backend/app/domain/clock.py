from datetime import datetime, timedelta, timezone

SEOUL = timezone(timedelta(hours=9))


def as_seoul(moment: datetime) -> datetime:
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return moment.astimezone(SEOUL)


def seoul_now() -> datetime:
    return datetime.now(SEOUL)


def parse_instant(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))
