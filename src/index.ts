import { SlackApp, type SlackEdgeAppEnv } from "slack-cloudflare-workers";
import { sleep } from "./lib/utils";
import { DurableObject } from "cloudflare:workers";

export class MyDurableObject extends DurableObject<Env> {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
	}

	async sayHello(name: string): Promise<string> {
		return `Hello, ${name}!`;
	}
}

export default {
	async fetch(
		request: Request,
		env: SlackEdgeAppEnv,
		ctx: ExecutionContext,
	): Promise<Response> {
		const app = new SlackApp({ env }).command(
			"/labby",
			async () => {},
			async ({ context, payload }) => {
				await sleep(1);
				await context.respond({
					text: `${payload.text || "What was that?"}`,
					response_type: "in_channel",
				});
			},
		);

		return await app.run(request, ctx);
	},
};
