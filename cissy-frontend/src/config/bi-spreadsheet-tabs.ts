/**
 * Default sheets for the BI viewer — each entry is a full Google Sheet URL (separate workbooks supported).
 *
 * Override: set `NEXT_PUBLIC_BI_SPREADSHEET_TABS` (JSON array of `{ "name", "url" }`) in `.env`.
 */
export const BI_SPREADSHEET_TAB_DEFS: { name: string; url: string }[] = [
  {
    name: "Aisles",
    url: "https://docs.google.com/spreadsheets/d/1vViZxaQjiV3dSAUmA7EvDy8WjGPTeXXtaQkrArHypDw/edit?gid=360553647",
  },
  {
    name: "Departments",
    url: "https://docs.google.com/spreadsheets/d/1VLUkQMOxeOa6XsHAnVDSfMcoah-3BvqOpIhOCR21lo0/edit?gid=1386477503",
  },
  {
    name: "Sheet 3",
    url: "https://docs.google.com/spreadsheets/d/1wsCpY24eYVe58gE92dmMT7e5swQwB9G1Q3CuLRNxV9s/edit?gid=315049627",
  },
  {
    name: "Sheet 4",
    url: "https://docs.google.com/spreadsheets/d/1UiIZiKYZdk7lY3z2D3zfXppPA54fK8L44TpwPiG0zDQ/edit?gid=174737311",
  },
  {
    name: "Sheet 5",
    url: "https://docs.google.com/spreadsheets/d/1QmiK-YmZDJDrkhBqxLPsFAuIPKQ8b9arhDzP-BecBxc/edit?gid=1399285355",
  },
];
