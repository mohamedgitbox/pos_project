export function TableSkeleton({ columns = 4 }: { columns?: number }) {
  const colCount = columns;
  return (
    <div className="fade-up">
      <table className="w-full">
        <thead className="bg-navy-800/50">
          <tr>
            {[...Array(colCount)].map((_, i) => (
              <th key={i} className="px-6 py-4 label">
                <div className="h-4 bg-navy-700 rounded skeleton-row w-24" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-navy-700/50">
          {[...Array(5)].map((_, i) => (
            <tr key={i}>
              {[...Array(colCount)].map((_, j) => (
                <td key={j} className="px-6 py-4">
                  <div className="h-4 bg-navy-700 rounded skeleton-row w-full" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
