// Shared constants used across the app
export const GENRE_MAP = {
    28: 'Action', 12: 'Adventure', 16: 'Animation', 35: 'Comedy',
    80: 'Crime', 99: 'Documentary', 18: 'Drama', 10751: 'Family',
    14: 'Fantasy', 36: 'History', 27: 'Horror', 10402: 'Music',
    9648: 'Mystery', 10749: 'Romance', 878: 'Sci-Fi', 10770: 'TV Movie',
    53: 'Thriller', 10752: 'War', 37: 'Western',
    10759: 'Action & Adventure', 10762: 'Kids', 10763: 'News',
    10764: 'Reality', 10765: 'Sci-Fi & Fantasy', 10766: 'Soap',
    10767: 'Talk', 10768: 'War & Politics',
};
// Date formatting utility
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function formatDate(dateStr) {
    if (!dateStr)
        return '';
    const [year, month, day] = dateStr.split('-');
    if (!year)
        return '';
    if (!month)
        return year;
    const monthName = MONTHS[parseInt(month, 10) - 1];
    if (!day)
        return `${monthName} ${year}`;
    return `${parseInt(day, 10)} ${monthName} ${year}`;
}
export const REGION_MAP = {
    ID: { name: 'Indonesia', flag: '🇮🇩' }, US: { name: 'United States', flag: '🇺🇸' },
    GB: { name: 'United Kingdom', flag: '🇬🇧' }, JP: { name: 'Japan', flag: '🇯🇵' },
    KR: { name: 'South Korea', flag: '🇰🇷' }, DE: { name: 'Germany', flag: '🇩🇪' },
    FR: { name: 'France', flag: '🇫🇷' }, IT: { name: 'Italy', flag: '🇮🇹' },
    ES: { name: 'Spain', flag: '🇪🇸' }, BR: { name: 'Brazil', flag: '🇧🇷' },
    MX: { name: 'Mexico', flag: '🇲🇽' }, CA: { name: 'Canada', flag: '🇨🇦' },
    AU: { name: 'Australia', flag: '🇦🇺' }, IN: { name: 'India', flag: '🇮🇳' },
    NL: { name: 'Netherlands', flag: '🇳🇱' }, TH: { name: 'Thailand', flag: '🇹🇭' },
    SG: { name: 'Singapore', flag: '🇸🇬' }, MY: { name: 'Malaysia', flag: '🇲🇾' },
    PH: { name: 'Philippines', flag: '🇵🇭' }, VN: { name: 'Vietnam', flag: '🇻🇳' },
    SE: { name: 'Sweden', flag: '🇸🇪' }, NO: { name: 'Norway', flag: '🇳🇴' },
    DK: { name: 'Denmark', flag: '🇩🇰' }, FI: { name: 'Finland', flag: '🇫🇮' },
    PL: { name: 'Poland', flag: '🇵🇱' }, PT: { name: 'Portugal', flag: '🇵🇹' },
    RU: { name: 'Russia', flag: '🇷🇺' }, TR: { name: 'Turkey', flag: '🇹🇷' },
    AR: { name: 'Argentina', flag: '🇦🇷' }, CL: { name: 'Chile', flag: '🇨🇱' },
    CO: { name: 'Colombia', flag: '🇨🇴' }, PE: { name: 'Peru', flag: '🇵🇪' },
    ZA: { name: 'South Africa', flag: '🇿🇦' }, NG: { name: 'Nigeria', flag: '🇳🇬' },
    EG: { name: 'Egypt', flag: '🇪🇬' }, SA: { name: 'Saudi Arabia', flag: '🇸🇦' },
    AE: { name: 'UAE', flag: '🇦🇪' }, TW: { name: 'Taiwan', flag: '🇹🇼' },
    HK: { name: 'Hong Kong', flag: '🇭🇰' }, NZ: { name: 'New Zealand', flag: '🇳🇿' },
};
