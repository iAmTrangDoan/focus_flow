const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const hours = ['9am', '10am', '11am', '12pm', '1pm', '2pm', '3pm', '4pm', '5pm'];

const data: number[][] = [
  [1, 2, 4, 4, 3, 1, 0],
  [2, 3, 4, 4, 4, 2, 0],
  [3, 4, 4, 3, 3, 1, 0],
  [1, 2, 2, 3, 2, 0, 0],
  [0, 1, 3, 4, 2, 1, 0],
  [2, 3, 4, 4, 3, 2, 1],
  [3, 4, 3, 3, 4, 1, 0],
  [2, 2, 3, 2, 3, 0, 0],
  [1, 1, 2, 2, 1, 0, 0],
];

const intensityColors = ['#F4FAF4', '#C8EAC8', '#9DD99F', '#6DC272', '#4A9459'];
const intensityLabels = ['None', 'Low', 'Moderate', 'High', 'Peak'];

export function ProductivityHeatmap() {
  return (
    <div
      className="px-6 py-6"
      style={{ background: '#FFFFFF', boxShadow: '0 2px 16px 0 rgba(36,48,36,0.07)', borderRadius: 20 }}
    >
      <div className="flex items-start justify-between mb-5 flex-wrap gap-3">
        <div>
          <h3 className="text-base font-semibold" style={{ color: '#243024' }}>Weekly Productivity Heatmap</h3>
          <p className="text-xs mt-0.5" style={{ color: '#5F6E5F' }}>Focus intensity by hour — this week</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: '#5F6E5F' }}>Less</span>
          {intensityColors.map((c, i) => (
            <div
              key={i}
              className="rounded-sm"
              style={{ width: 14, height: 14, background: c, border: '1px solid rgba(36,48,36,0.06)' }}
              title={intensityLabels[i]}
            />
          ))}
          <span className="text-xs" style={{ color: '#5F6E5F' }}>More</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-separate" style={{ borderSpacing: '3px' }}>
          <thead>
            <tr>
              <th className="w-12" />
              {days.map((d) => (
                <th key={d} className="text-center text-xs font-medium pb-2" style={{ color: '#5F6E5F' }}>{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((h, hi) => (
              <tr key={h}>
                <td className="text-right text-xs pr-2 whitespace-nowrap" style={{ color: '#5F6E5F' }}>{h}</td>
                {days.map((d, di) => (
                  <td key={d} className="p-0">
                    <div
                      className="rounded-md transition-transform duration-100 hover:scale-110 cursor-default"
                      style={{
                        width: '100%',
                        paddingBottom: '100%',
                        background: intensityColors[data[hi][di]],
                        border: '1px solid rgba(36,48,36,0.05)',
                      }}
                      title={`${d} ${h}: ${intensityLabels[data[hi][di]]}`}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-5 flex gap-4 flex-wrap" style={{ borderTop: '1px solid #D4E8D4', paddingTop: 16 }}>
        {[
          { label: 'Peak Hours', value: '10am – 12pm', color: '#4A9459' },
          { label: 'Total Focus Time', value: '18.5 hrs', color: '#4A7FB8' },
          { label: 'Best Day', value: 'Wednesday', color: '#B8860B' },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: '#F4FAF4' }}>
            <div className="rounded-full shrink-0" style={{ width: 8, height: 8, background: s.color }} />
            <span className="text-xs" style={{ color: '#5F6E5F' }}>{s.label}:</span>
            <span className="text-xs font-semibold" style={{ color: '#243024' }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
