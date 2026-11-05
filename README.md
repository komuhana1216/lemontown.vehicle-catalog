# Vehicle Catalog (GitHub Pages)

## Google Sheets setup

The site reads the sheet as public CSV from the browser. In Google Sheets, use **File → Share → Publish to web**, choose the worksheet and **Comma-separated values (.csv)**, then publish it. Anyone who can open the site can read the published rows.

The configured sheet URL is in `app.js`. If the tab name is not `シート1`, change the `sheet=` value there to the exact worksheet name. Google Sheets encodes Japanese tab names in the URL automatically; the simplest setup is to copy the published CSV link and replace `SHEET_CSV_URL`.

## Columns

Required headers: `車名`, `価格`. Optional headers: `カテゴリ`, `画像` (public image URL), and `販売場所`. Header matching also accepts the aliases listed in `FIELD_MAP` in `app.js`.

Category names should contain `普通車`, `高級車`, `航空機`, or `ボート`. If there is no category column, the page tries to infer the category from the vehicle name. Add a category column for reliable filtering. When location is blank, the page uses a generic category-specific label; replace `DEFAULT_LOCATION` in `app.js` with the actual shop/location names.

## Publish with GitHub Pages

Place these files at the repository root (or configure Pages to use the `outputs` folder as the publishing source) and enable GitHub Pages in the repository settings. The `普通車(200)`, `高級車(670)`, and `ボート(356)` tab labels are configured in `CATEGORIES`; aircraft shows the current number of matching rows.

### Note on counts

The numbers in parentheses are display labels from the request. The catalog itself filters the live rows returned by the spreadsheet. Update the `count` values in `CATEGORIES` if those labels should follow sheet totals instead.
