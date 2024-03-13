import React, { useState, useEffect, useMemo, useCallback } from "react";
import axios from "axios";
import numeral from "numeral";
import { formatDistanceToNowStrict } from "date-fns";
import { useTable, useSortBy } from "react-table";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faChartLine,
  faGlobe,
  faTrash,
  faChevronDown,
  faChevronUp,
} from "@fortawesome/free-solid-svg-icons";
import { faTwitter, faTelegram } from "@fortawesome/free-brands-svg-icons";
import "./App.css";

function App() {
  const [tokens, setTokens] = useState([]);

  const fetchData = () => {
    axios
      .get("http://localhost:8000/tokens")
      .then((response) => {
        console.log(`fetched ${response.data.length} tokens`);
        setTokens(response.data);
      })
      .catch((error) =>
        console.error("There was an error fetching the tokens!", error)
      );
  };

  // Initial data fetch and setting up the interval for refreshing data
  useEffect(() => {
    fetchData();
    const intervalId = setInterval(fetchData, 30000); // 60000 ms = 1 minute

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, []);

  const markAsScam = useCallback(
    (tokenId) => {
      console.log(
        `Attempting to mark token with ID ${tokenId} as scam. Type of tokenId: ${typeof tokenId}`
      );

      // Ensure tokenId is treated as a number for comparison, given the IDs are numbers
      const numericTokenId = Number(tokenId);

      const token = tokens.find((t) => t.id === numericTokenId);

      if (token) {
        console.log(`Token found: `, token);
        axios
          .post("http://localhost:8000/mark_scam", {
            pair_address: token.pair_address,
          })
          .then((response) => {
            console.log("Marked as scam successfully", response);
            fetchData(); // Refresh the tokens list here to reflect the changes
          })
          .catch((error) => {
            console.error("Error marking as scam", error);
          });
      } else {
        console.error(`No token found with ID ${tokenId}`);
      }
    },
    [tokens]
  );

  const columns = useMemo(
    () => [
      {
        Header: "Name",
        accessor: "pair_name",
        Cell: ({ value }) => <div className="max-w-xs truncate">{value}</div>,
      },
      {
        Header: "Launched",
        accessor: "created_at",
        Cell: ({ value }) =>
          formatDistanceToNowStrict(new Date(value), { addSuffix: true }),
        sortType: (a, b) =>
          new Date(a.original.created_at) - new Date(b.original.created_at),
      },
      {
        Header: "Launch FDV",
        accessor: (d) => numeral(d.launch_fdv).format("$0,0.0a"),
        id: "launch_fdv",
      },
      {
        Header: "Current FDV",
        accessor: (d) => numeral(d.current_fdv).format("$0,0.0a"),
        id: "current_fdv",
        Cell: ({ row }) => (
          <div
            className={`${
              row.original.current_fdv > row.original.launch_fdv
                ? "bg-green-100"
                : ""
            } p-2`}
          >
            {numeral(row.original.current_fdv).format("$0,0.0a")}
          </div>
        ),
      },
      {
        Header: "Launch Liquidity",
        accessor: (d) => numeral(d.launch_liquidity).format("$0,0.0a"),
        id: "launch_liquidity",
      },
      {
        Header: "Current Liquidity",
        accessor: (d) => numeral(d.current_liquidity).format("$0,0.0a"),
        id: "current_liquidity",
        Cell: ({ row }) => (
          <div
            className={`${
              row.original.current_liquidity > row.original.launch_liquidity
                ? "bg-green-100"
                : ""
            } p-2`}
          >
            {numeral(row.original.current_liquidity).format("$0,0.0a")}
          </div>
        ),
      },
      {
        Header: "External Links",
        id: "external_links",
        accessor: (d) => (
          <div className="space-x-4">
            <a href={d.twitter_url} target="_blank" rel="noopener noreferrer">
              <FontAwesomeIcon icon={faTwitter} />
            </a>
            <a href={d.telegram_url} target="_blank" rel="noopener noreferrer">
              <FontAwesomeIcon icon={faTelegram} />
            </a>
            <a href={d.website_url} target="_blank" rel="noopener noreferrer">
              <FontAwesomeIcon icon={faGlobe} />
            </a>
            <a
              href={d.dexscreener_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              <FontAwesomeIcon icon={faChartLine} />
            </a>
          </div>
        ),
      },
      {
        Header: "Updated",
        accessor: "updated_at",
        Cell: ({ value }) =>
          formatDistanceToNowStrict(new Date(value), { addSuffix: true }),
        sortType: (a, b) =>
          new Date(a.original.updated_at) - new Date(b.original.updated_at),
      },
      {
        Header: "Scam",
        id: "is_scam",
        accessor: (d) => (
          <button
            onClick={() => markAsScam(d.id)}
            className="text-red-500 hover:text-red-700"
          >
            <FontAwesomeIcon icon={faTrash} />
          </button>
        ),
      },
    ],
    [markAsScam]
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    // Remove setSortBy if unused
  } = useTable(
    {
      columns,
      data: tokens,
      initialState: { sortBy: [{ id: "created_at", desc: true }] },
    },
    useSortBy
  );

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <div className="mx-auto" style={{ maxWidth: "fit-content" }}>
        <div className="bg-white shadow overflow-hidden rounded-lg">
          <div className="overflow-x-auto">
            <table {...getTableProps()} className="min-w-full">
              <thead>
                {headerGroups.map((headerGroup) => (
                  <tr
                    {...headerGroup.getHeaderGroupProps()}
                    className="bg-gray-200"
                  >
                    {headerGroup.headers.map((column) => (
                      <th
                        {...column.getHeaderProps(
                          column.getSortByToggleProps()
                        )}
                        className="sticky top-0 z-10 px-6 py-6 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider"
                      >
                        {column.render("Header")}
                        <span>
                          {column.isSorted ? (
                            column.isSortedDesc ? (
                              <FontAwesomeIcon
                                icon={faChevronDown}
                                className="ml-2"
                              />
                            ) : (
                              <FontAwesomeIcon
                                icon={faChevronUp}
                                className="ml-2"
                              />
                            )
                          ) : (
                            ""
                          )}
                        </span>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody
                {...getTableBodyProps()}
                className="divide-y divide-gray-200"
              >
                {rows.map((row) => {
                  prepareRow(row);
                  return (
                    <tr {...row.getRowProps()}>
                      {row.cells.map((cell) => {
                        return (
                          <td
                            {...cell.getCellProps()}
                            className="px-6 my-6 whitespace-nowrap text-sm text-gray-800"
                          >
                            {cell.render("Cell")}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
