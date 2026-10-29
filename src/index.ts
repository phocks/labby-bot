import {
	SlackApp,
	SlackEdgeAppEnv,
	isPostedMessageEvent,
} from "slack-cloudflare-workers";

export default {
	async fetch(
		request: Request,
		env: SlackEdgeAppEnv,
		ctx: ExecutionContext,
	): Promise<Response> {
		const app = new SlackApp({ env }).command(
			"/labby",
			async () => "Thinking...",
			async ({ context, payload }) => {
				await context.respond({
					text: `${payload.text || "What was that?"}`,
					response_type: "in_channel",
				});
			},
		);

		return await app.run(request, ctx);
	},
};

const sleep = (seconds: number) => {
	return new Promise((resolve) => setTimeout(resolve, seconds * 1000));
};
