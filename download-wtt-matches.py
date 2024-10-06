import asyncio
import pandas as pd
from playwright.async_api import async_playwright, Playwright, Page, TimeoutError
import os
from datetime import datetime
import json

async def get_matches(page: Page, evt: int):
    err = None

    async def intercept(resp):
        global err

        if 'GetMatchCardDetails' in resp.url:
            try:
                match = await resp.json()
                with open(os.path.join('data/wtt_matches', match['eventId'], f"{match['documentCode']}.json"), 'w') as f:
                    json.dump(match, f, ensure_ascii=False, indent=2)
            except Exception as e:
                err = e

    page.on('response', lambda resp: asyncio.ensure_future(intercept(resp)))

    await page.goto(f'https://worldtabletennis.com/eventInfo?selectedTab=Results&innerselectedTab=Completed&eventId={evt}')
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
        return

    retry = 5
    while True:
        load_btn = await page.query_selector('[class="generic_btn"]')

        if not load_btn:
            retry-=1
            if retry < 0:
                break
        else:
            retry = 5
            await load_btn.click()
        await asyncio.sleep(1)

    if err:
        print(err)


async def run(playwright: Playwright):
    chromium = playwright.chromium # or "firefox" or "webkit".
    browser = await chromium.launch()
    page = await browser.new_page()
    await page.goto("http://example.com")
    # other actions...
    await browser.close()

async def main():
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch()
        page = await browser.new_page()

        tf = pd.read_csv('data/tournaments_wtt.tsv', sep='\t', parse_dates=['StartDateTime', 'EndDateTime'])
        for row in tf[tf.EndDateTime < datetime.now()].itertuples():
            print(f'Processing Event {row.EventId}')
            path = os.path.join('data/wtt_matches', f'{row.EventId}')
            if os.path.exists(path):
                continue
            else:
                os.mkdir(path)

            await get_matches(page, row.EventId)

        await browser.close()
    

if __name__ == "__main__":
    asyncio.run(main())
