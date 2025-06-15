import { createEvent } from "#base";
import { loadPendingReminders } from "#functions";

createEvent({
    name: "onReady",
    event: "ready",
    async run(client) {
        await loadPendingReminders(client);
    }
});