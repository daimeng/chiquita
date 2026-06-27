import asyncio
import pandas as pd
from playwright.async_api import async_playwright, Playwright, Page, TimeoutError
import os
from datetime import datetime
import json
from typing import Any
import logging

# Configure logger to write to download_log.txt without affecting stdout logging
logger = logging.getLogger('download_logger')
logger.setLevel(logging.INFO)
logger.propagate = False  # Prevent messages from propagating to the root logger/stdout

file_handler = logging.FileHandler('download_log.txt', mode='a', encoding='utf-8')
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)

async def get_matches(page: Page, row: Any):
    evt: int = row.EventId
    ittfworld: bool = row.EventTypeId == 95 or 'ITTF World' in row.EventName
    err = None
    def save_match(match, source_type: str):
        dest_dir = os.path.join('data/wtt_matches', str(match['eventId']))
        os.makedirs(dest_dir, exist_ok=True)
        dest_file = os.path.join(dest_dir, f"{match['documentCode']}.json")
        with open(dest_file, 'w') as f:
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


    page.on('response', lambda resp: asyncio.ensure_future(intercept(resp)))

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

    if err:
        print(err)
        logger.error(f"Event {evt}: Finished with error: {err}")
    else:
        logger.info(f"Event {evt}: Finished successfully")


async def run(playwright: Playwright):
    chromium = playwright.chromium # or "firefox" or "webkit".
    browser = await chromium.launch()
    page = await browser.new_page()
    await page.goto("http://example.com")
    # other actions...
    await browser.close()

async def main():
    logger.info("Script started: download-wtt-matches")
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch()
        page = await browser.new_page()

        tf = pd.read_csv('data/tournaments_wtt.tsv', sep='\t', parse_dates=['StartDateTime', 'EndDateTime'])
        logger.info(f"Loaded {len(tf)} tournament records from TSV")
        for row in tf[tf.EndDateTime < datetime.now()].itertuples():
            print(f'Processing Event {row.EventId}')
            path = os.path.join('data/wtt_matches', f'{row.EventId}')
            if os.path.exists(path):
                logger.info(f"Event {row.EventId} already processed (directory exists: {path}), skipping")
                continue
            else:
                logger.info(f"Creating directory: {path}")
                os.makedirs(path, exist_ok=True)

            logger.info(f"Starting processing for Event {row.EventId} (Name: {row.EventName})")
            await get_matches(page, row)
            logger.info(f"Finished processing for Event {row.EventId}")

        await browser.close()
    logger.info("Script completed: download-wtt-matches")
    

if __name__ == "__main__":
    asyncio.run(main())
