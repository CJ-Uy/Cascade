"use client";

import { useState, useEffect } from "react";

export default function Sample() {
  const [apiData, setApiData] = useState(null);

  // Run once on mount
  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch("/api/test", {
          method: "POST",
          body: JSON.stringify({ id: "5" })
        });
        if (!response.ok) {
          throw new Error(`API call failed with status: ${response.status}`);
        }
        const data = await response.json();
        setApiData(data);
      } catch (err) {
        console.error("Failed to fetch data:", err);
      } 
    }

    fetchData(); // Call the fetching function
  }, []);

  return (
    <>
      <h2>Data from API (/api/test):</h2>
      {apiData ? (
        <pre>{JSON.stringify(apiData, null, 2)}</pre>
      ) : (
        <p>No data fetched or data is null.</p>
      )}
    </>
  );
}
