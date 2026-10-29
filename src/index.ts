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

	async increment(): Promise<number> {
		let value: number = (await this.ctx.storage.get("value")) || 0;
		value += 1;
		await this.ctx.storage.put("value", value);
		return value;
	}
}

export default {
	async fetch(
		request: Request,
		env: Env,
		ctx: ExecutionContext,
	): Promise<Response> {
		const app = new SlackApp({ env })
			.command(
				"/labby",
				async () => {},
				async ({ context, payload }) => {
					const stub = env.MY_DURABLE_OBJECT.getByName("foo");
					// const whatToSay = await stub.sayThis(payload.text);
					const whatToSay = await stub.increment();
					await context.respond({
						text: `Count is: ${whatToSay || "Sorry something went wrong..."}`,
						response_type: "in_channel",
					});
				},
			)
			.event("app_home_opened", async ({ context }) => {
				await context.client.views.publish({
					user_id: context.botUserId,
					view: { type: "home", blocks: [] },
				});
			});

		return await app.run(request, ctx);
	},
};
