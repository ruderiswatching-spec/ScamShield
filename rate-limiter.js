const minuteRequestLimit = 3;
const dailyRequestLimit = 20;
const minuteMilliseconds = 60 * 1000;

export class RequestRateLimiter {
    constructor() {
        this.entries = new Map();
    }

    check(clientAddress, now = Date.now()) {
        const utcDay = new Date(now).toISOString().slice(0, 10);
        for (const [address, entry] of this.entries) {
            if (entry.utcDay !== utcDay) {
                this.entries.delete(address);
            }
        }

        let entry = this.entries.get(clientAddress);
        if (!entry || entry.utcDay !== utcDay) {
            entry = { utcDay, dailyCount: 0, requestTimestamps: [] };
            this.entries.set(clientAddress, entry);
        }

        entry.requestTimestamps = entry.requestTimestamps.filter(
            (timestamp) => now - timestamp < minuteMilliseconds
        );
        if (entry.dailyCount >= dailyRequestLimit) {
            const date = new Date(now);
            const nextUtcDay = Date.UTC(
                date.getUTCFullYear(),
                date.getUTCMonth(),
                date.getUTCDate() + 1
            );
            return {
                limitType: "daily",
                retryAfterSeconds: Math.ceil((nextUtcDay - now) / 1000)
            };
        }
        if (entry.requestTimestamps.length >= minuteRequestLimit) {
            return {
                limitType: "minute",
                retryAfterSeconds: Math.ceil(
                    (entry.requestTimestamps[0] + minuteMilliseconds - now) / 1000
                )
            };
        }

        entry.requestTimestamps.push(now);
        entry.dailyCount += 1;
        return null;
    }
}
