import { SlackApp, type SlackEdgeAppEnv } from "slack-cloudflare-workers";
import { sleep } from "./lib/utils";
import { DurableObject } from "cloudflare:workers";

type Env = SlackEdgeAppEnv & {
	MY_DURABLE_OBJECT: DurableObjectNamespace<MyDurableObject>;
};

export class MyDurableObject extends DurableObject<Env> {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);
	}

	async sayThis(name: string): Promise<string> {
		return `${name}`;
	}
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		const app = new SlackApp({ env }).command(
			"/labby",
			async () => {},
			async ({ context, payload }) => {
				await sleep(1);
				const stub = env.MY_DURABLE_OBJECT.getByName("foo");
				const whatToSay = await stub.sayThis(payload.text);
				await context.respond({
					text: `${whatToSay || "Sorry I didn't get that..."}`,
					response_type: "in_channel",
				});
			},
		);

		return await app.run(request, ctx);
	},
};
