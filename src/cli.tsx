import { render } from "ink";
import { App } from "@/app.tsx";

const topic = process.argv[2];

render(<App initialTopic={topic} />);
