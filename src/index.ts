import { SlackApp, type SlackEdgeAppEnv } from "slack-cloudflare-workers";
import { sleep } from "./lib/utils";
import { DurableObject } from "cloudflare:workers";

type Env = SlackEdgeAppEnv & {
	MY_DURABLE_OBJECT: DurableObjectNamespace<MyDurableObject>;
};

export class MyDurableObject extends DurableObject<Env> {
	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);

		ctx.blockConcurrencyWhile(async () => {
			const existing = await ctx.storage.get<string[]>("names");
			if (!existing) {
				await ctx.storage.put("names", ["Alice", "Bob", "Charlie"]);
			}
		});
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

	async getNames(): Promise<string[]> {
		return (await this.ctx.storage.get<string[]>("names")) ?? [];
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
					const stub = env.MY_DURABLE_OBJECT.getByName("names");
					const names = await stub.getNames();

					await context.respond({
						text: names.map((name) => `• ${name}`).join("\n"),
						response_type: "in_channel",
					});
					// const stub = env.MY_DURABLE_OBJECT.getByName("foo");
					// const whatToSay = await stub.increment();
					// await context.respond({
					// 	text: `Count is: ${whatToSay || "Sorry something went wrong..."}`,
					// 	response_type: "in_channel",
					// });
				},
			)
			.event("app_home_opened", async ({ payload, context }) => {
				await context.client.views.publish({
					user_id: payload.user,
					view: {
						type: "home",
						blocks: [
							{
								type: "section",
								text: {
									type: "mrkdwn",
									text: "Hello World! From Labby Bot :)",
								},
								accessory: {
									type: "image",
									image_url:
										"https://api.slack.com/img/blocks/bkb_template_images/notifications.png",
									alt_text: "calendar thumbnail",
								},
							},
						],
					},
				});
			});

		return await app.run(request, ctx);
	},
};
