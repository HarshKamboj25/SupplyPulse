import { EventEmitter } from "node:events";

class SupplyPulseEventBus extends EventEmitter {}
const eventBus = new SupplyPulseEventBus();

eventBus.on("stock.received", ({ poNumber }) => {
  console.log(`[EVENT] Stock received for purchase order ${poNumber}`);
});

export default eventBus;
