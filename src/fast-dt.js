const seconds_per_day = 24 * 60 * 60 * 1000

export function ymd(ts) {
  let days_since_epoch = ts / seconds_per_day
  let year = 1970

  let leap = 0
  while (true) {
    if (year % 400) {
      leap = 1
    } else if (year % 100) {
      leap = 0
    } else if (year % 4) {
      leap = 1
    }
    if (days_since_epoch < 365 + leap) break

    days_since_epoch -= 365 + leap
    year += 1
  }

  let month = 1
  while (true) {
    let days_in_month = 31
    switch (month) {
      case 2:
        days_in_month = 28 + leap
      case 4, 6, 9, 11:
        days_in_month = 30
    }
    if (days_since_epoch < days_in_month) break

    days_since_epoch -= days_in_month
    month += 1
  }

  let day = Math.floor(days_since_epoch) + 1

  return `${year}-${month}-${day}`
}
