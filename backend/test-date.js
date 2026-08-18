    function parseStartOfDay(dateStr) {
        const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            const [, y, m, d] = match;
            return new Date(Number(y), Number(m) - 1, Number(d), 0, 0, 0, 0);
        }
        const date = new Date(dateStr);
        date.setHours(0, 0, 0, 0);
        return date;
    }

    function formatLocalDateString(date) {
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    function getLastMonday() {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0 = CN, 1 = T2, ...
        const daysToLastMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const monday = new Date(now);
        monday.setDate(monday.getDate() - daysToLastMonday - 7);
        monday.setHours(0, 0, 0, 0);
        return monday;
    }

    console.log("getLastMonday():", getLastMonday().toISOString(), getLastMonday());
    console.log("parseStartOfDay('2026-08-10'):", parseStartOfDay('2026-08-10').toISOString());

    const d = new Date(2026, 7, 10, 0, 0, 0); // 2026-08-10
    console.log("d:", d.toISOString());
    console.log("formatLocalDateString(d):", formatLocalDateString(d));
