import { render } from "ink";
import { App } from "@/app.tsx";

const arg = process.argv[2];
const isConfigure = arg === "configure";
const topic = isConfigure ? undefined : arg;

render(<App initialTopic={topic} forceConfigure={isConfigure} />);
