/**
 * Returns the index where x should be inserted in a to maintain order.
 * If x is already in a, the index will be equal to the first occurrence
 * (i.e., the new x would be inserted before the old x).
 */
export function bisect_left(a: Array<number>, x: number, lo=0, hi=null) {
    if (lo < 0) lo = 0;
    if (hi === null) hi = a.length;
    while (lo < hi) {
        let mid = Math.floor((lo + hi)/2);
        if (a[mid] < x) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}

/**
 * Returns the index where x should be inserted in a to maintain order.
 * If x is already in a, the index will be equal to the index following
 * the last occurrence of x.
 */
export function bisect_right(a: Array<number>, x: number, lo=0, hi=null) {
    if (lo < 0) lo = 0;
    if (hi === null) hi = a.length;
    while (lo < hi) {
        let mid = Math.floor((lo + hi)/2);
        if (x < a[mid]) hi = mid;
        else lo = mid + 1;
    }
    return lo;
}

/**
 * Takes an array where each element is a probability mass, and returns an array
 * of the same length where each element is the cumulative probability up to and
 * including the corresponding index.
 */
export function pdf_to_cdf(a: Array<number>) {
    let sum = 0;
    let cdf = [];
    for (let p of a) {
        sum += p;
        cdf.push(sum);
    }
    return cdf;
}

/**
 * Get a random int in the specified range (inclusive).
 */
export function getRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

/**
 * Return n [item, index] pairs sampled from a.
 */
export function sample<T>(a: Array<T>, n: number = 1): Array<[T, number]> {
    if (n === 1) {
        let idx = getRandomInt(0, a.length - 1);
        return [[a[idx], idx]];
    }
    else {
        let shuffled: Array<[T, number]> = [...a].map((v, i) => [v, i]), i = a.length, temp, index;
        while (i--) {
            index = Math.floor((i + 1) * Math.random());
            temp = shuffled[index];
            shuffled[index] = shuffled[i];
            shuffled[i] = temp;
        }
        return shuffled.slice(0, n);
    }
}