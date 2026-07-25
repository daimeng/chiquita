import asyncio
import pandas as pd
from playwright.async_api import async_playwright, Playwright, Page, TimeoutError
import os
import shutil
from datetime import datetime
import json
from typing import Any, Optional
import logging

# Configure logger to write to download_log.txt without affecting stdout logging
logger = logging.getLogger('download_logger')
logger.setLevel(logging.INFO)
logger.propagate = False  # Prevent messages from propagating to the root logger/stdout

file_handler = logging.FileHandler('download_log.txt', mode='w', encoding='utf-8')
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)


def count_entries(dest_dir: str) -> int:
    if not os.path.exists(dest_dir):
        return 0
    return len([
        f for f in os.listdir(dest_dir)
        if f.endswith('.json') and f != 'metadata.json'
    ])


def cleanup_folder(dest_dir: str):
    if not os.path.exists(dest_dir):
        return
    logger.info(f"Cleaning up folder: {dest_dir}")
    for filename in os.listdir(dest_dir):
        if filename == 'metadata.json':
            continue
        file_path = os.path.join(dest_dir, filename)
        try:
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.unlink(file_path)
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)
        except Exception as e:
            logger.error(f"Error deleting {file_path}: {e}")


def save_metadata(
    dest_dir: str,
    row: Any,
    completed: bool,
    retry_count: int,
    start_time: Optional[datetime],
    end_time: Optional[datetime],
    entries_downloaded: int,
    exception: Optional[Exception]
):
    os.makedirs(dest_dir, exist_ok=True)
    metadata_file = os.path.join(dest_dir, 'metadata.json')
    duration_seconds = (end_time - start_time).total_seconds() if (start_time and end_time) else None

    metadata = {
        "event_id": int(row.EventId),
        "event_name": str(row.EventName),
        "completed": completed,
        "retry_count": retry_count,
        "start_time": start_time.isoformat() if start_time else None,
        "end_time": end_time.isoformat() if end_time else None,
        "duration_seconds": round(duration_seconds, 2) if duration_seconds is not None else None,
        "entries_downloaded": entries_downloaded,
        "exception": str(exception) if exception is not None else None,
        "last_updated": datetime.now().isoformat()
    }
    with open(metadata_file, 'w', encoding='utf-8') as f:
        json.dump(metadata, f, ensure_ascii=False, indent=2)
    logger.info(f"Event {row.EventId}: Saved metadata.json (completed={completed}, retries={retry_count}, entries={entries_downloaded})")


def load_metadata(dest_dir: str) -> Optional[dict]:
    metadata_file = os.path.join(dest_dir, 'metadata.json')
    if os.path.exists(metadata_file):
        try:
            with open(metadata_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Failed to read {metadata_file}: {e}")
    return None


async def get_matches(page: Page, row: Any):
    evt: int = row.EventId
    ittfworld: bool = row.EventTypeId == 95 or 'ITTF World' in str(row.EventName)
    err = None

    def save_match(match, source_type: str):
        dest_dir = os.path.join('data/wtt_matches', str(match['eventId']))
        os.makedirs(dest_dir, exist_ok=True)
        dest_file = os.path.join(dest_dir, f"{match['documentCode']}.json")
        with open(dest_file, 'w', encoding='utf-8') as f:
            json.dump(match, f, ensure_ascii=False, indent=2)
        logger.info(f"Event {evt}: Saved match details (from {source_type}) to {dest_file}")

    async def intercept(resp):
        nonlocal err
        if 'GetMatchCardDetails' in resp.url:
            try:
                match = await resp.json()
                save_match(match, 'GetMatchCardDetails')
            except Exception as e:
                err = e
                logger.error(f"Event {evt}: Error saving match details from GetMatchCardDetails: {e}", exc_info=True)

        elif 'officialresult.json' in resp.url:
            try:
                data = await resp.json()
                for match in data:
                    save_match(match, 'officialresult.json')
            except Exception as e:
                err = e
                logger.error(f"Event {evt}: Error saving match details from officialresult.json: {e}", exc_info=True)

    page.on('response', lambda resp: asyncio.create_task(intercept(resp)))

    url = (
        f'https://worldcupresults.ittf.com/eventInfo?selectedTab=Results&innerselectedTab=Completed&eventId={evt}'
        if ittfworld
        else f'https://worldtabletennis.com/eventInfo?selectedTab=Matches&eventId={evt}'
    )
    logger.info(f"Event {evt}: Navigating to {url}")
    await page.goto(url)
    btn_selector = asyncio.create_task(page.wait_for_selector('[class="generic_btn"]'))
    empty_selector = asyncio.create_task(page.wait_for_selector('.fa.fa-info-circle'))
    first_done, pending = await asyncio.wait(
        [btn_selector, empty_selector],
        return_when=asyncio.FIRST_COMPLETED
    )
    if pending:
        second = pending.pop()
        second.cancel()

    first = first_done.pop()
    load_btn = await first
    text = await page.evaluate('(element) => element.textContent', load_btn)

    if text.lower() != 'load more':
        print(f'Empty Event! {evt}')
        logger.info(f"Event {evt}: Empty Event (load button text: '{text}')")
        return

    retry = 5 
    while True:
        cookies = await page.query_selector('.cc_b_ok')
        if cookies and await cookies.is_visible():
            logger.info(f"Event {evt}: Cookie banner visible, clicking accept")
            await cookies.click()

        load_btn = await page.query_selector('[class="generic_btn"]:has-text("load more")')

        if not load_btn:
            retry -= 1
            logger.info(f"Event {evt}: 'load more' button not found. Retries remaining: {retry}")
            if retry < 0:
                logger.info(f"Event {evt}: Stopped looking for 'load more' button")
                break
        else:
            retry = 5
            logger.info(f"Event {evt}: Clicking 'load more' button")
            await load_btn.click()
        await asyncio.sleep(1)

    await asyncio.sleep(2)  # Allow remaining async response intercept tasks to complete

    if err:
        print(err)
        logger.error(f"Event {evt}: Finished with error: {err}")
        raise err
    else:
        logger.info(f"Event {evt}: Finished successfully")


async def process_event(browser, row: Any, max_retries: int = 3):
    evt = row.EventId
    dest_dir = os.path.join('data/wtt_matches', str(evt))
    metadata = load_metadata(dest_dir)

    if metadata and metadata.get('completed', False):
        logger.info(f"Event {evt} already completed (metadata.json completed=True), skipping")
        return

    if not metadata and os.path.exists(dest_dir) and count_entries(dest_dir) > 0:
        entries = count_entries(dest_dir)
        save_metadata(
            dest_dir, row, completed=True, retry_count=0,
            start_time=None, end_time=None, entries_downloaded=entries,
            exception=None
        )
        logger.info(f"Event {evt} already processed ({entries} entries), created metadata.json, skipping")
        return

    initial_retry_count = metadata.get('retry_count', 0) if metadata else 0
    current_retry_count = initial_retry_count

    for attempt in range(max_retries + 1):
        if attempt > 0:
            current_retry_count += 1
            logger.info(f"Event {evt}: Retrying scraping (attempt {attempt}/{max_retries}, retry_count={current_retry_count})")
            await asyncio.sleep(2)

        start_time = datetime.now()
        os.makedirs(dest_dir, exist_ok=True)
        page = await browser.new_page()

        try:
            logger.info(f"Event {evt}: Starting scraping attempt (retry_count={current_retry_count})")
            await get_matches(page, row)
            end_time = datetime.now()
            entries = count_entries(dest_dir)
            save_metadata(
                dest_dir, row, completed=True, retry_count=current_retry_count,
                start_time=start_time, end_time=end_time, entries_downloaded=entries,
                exception=None
            )
            print(f"Successfully processed Event {evt} ({entries} matches downloaded)")
            break
        except Exception as e:
            end_time = datetime.now()
            logger.error(f"Event {evt}: Exception caught while scraping: {e}", exc_info=True)
            print(f"Exception during scraping Event {evt}: {e}. Cleaning up folder.")
            cleanup_folder(dest_dir)
            save_metadata(
                dest_dir, row, completed=False, retry_count=current_retry_count,
                start_time=start_time, end_time=end_time, entries_downloaded=0,
                exception=e
            )
        finally:
            try:
                await page.close()
            except Exception:
                pass


async def main():
    logger.info("Script started: download-wtt-matches")
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch()

        tf = pd.read_csv('data/tournaments_wtt.tsv', sep='\t', parse_dates=['StartDateTime', 'EndDateTime'])
        logger.info(f"Loaded {len(tf)} tournament records from TSV")
        for row in tf.itertuples():
            end_time = row.EndDateTime
            if end_time.time() == datetime.min.time():
                end_time = end_time + pd.Timedelta(days=1)

            if end_time >= datetime.now():
                logger.info(f"Event {row.EventId} ({row.EventName}) has not ended yet (EndDateTime: {row.EndDateTime}), skipping download")
                continue

            print(f'Processing Event {row.EventId}')
            await process_event(browser, row)

        await browser.close()
    logger.info("Script completed: download-wtt-matches")


if __name__ == "__main__":
    asyncio.run(main())
