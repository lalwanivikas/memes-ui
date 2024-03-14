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
  const [previousTokenCount, setPreviousTokenCount] = useState(0);

  let seenTokenIds = new Set(); // Tracks seen token IDs

  const fetchData = () => {
    axios
      .get("http://localhost:8000/tokens")
      .then((response) => {
        const newTokens = response.data.filter(
          (token) => !seenTokenIds.has(token.id)
        );
        if (newTokens.length > 0 && document.visibilityState === "hidden") {
          new Notification(`${newTokens.length} more tokens launched`);
        }
        newTokens.forEach((token) => seenTokenIds.add(token.id)); // Update seen IDs
        setTokens(response.data); // Assume you handle deduplication or just re-rendering
      })
      .catch((error) =>
        console.error("There was an error fetching the tokens!", error)
      );
  };

  useEffect(() => {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        console.log("Notification permission granted.");
      } else {
        console.log("Notification permission denied.");
      }
    });
    fetchData();
    const intervalId = setInterval(fetchData, 30000);
    return () => clearInterval(intervalId);
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
        Header: "Launched ",
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
                ? "bg-green-500"
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
                ? "bg-green-500"
                : ""
            } p-2`}
          >
            {numeral(row.original.current_liquidity).format("$0,0.0a")}
          </div>
        ),
      },
      {
        Header: "Socials",
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
    <div>
      <table {...getTableProps()}>
        <thead>
          {headerGroups.map((headerGroup) => (
            <tr {...headerGroup.getHeaderGroupProps()}>
              {headerGroup.headers.map((column) => (
                <th {...column.getHeaderProps(column.getSortByToggleProps())}>
                  {column.render("Header")}
                  <span>
                    {column.isSorted ? (
                      column.isSortedDesc ? (
                        <FontAwesomeIcon icon={faChevronDown} />
                      ) : (
                        <FontAwesomeIcon icon={faChevronUp} />
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
        <tbody {...getTableBodyProps()}>
          {rows.map((row) => {
            prepareRow(row);
            return (
              <tr {...row.getRowProps()}>
                {row.cells.map((cell) => (
                  <td {...cell.getCellProps()}>{cell.render("Cell")}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default App;
