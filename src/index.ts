import { SlackApp, type SlackEdgeAppEnv } from "slack-cloudflare-workers";
import { DurableObject } from "cloudflare:workers";

type Env = SlackEdgeAppEnv & {
  MY_DURABLE_OBJECT: DurableObjectNamespace<MyDurableObject>;
};

export class MyDurableObject extends DurableObject<Env> {
  async getNames(): Promise<string[]> {
    return (await this.ctx.storage.get<string[]>("names")) ?? [];
  }

  /** Returns false if the name was already on the list. */
  async addName(name: string): Promise<boolean> {
    const names = await this.getNames();
    if (names.includes(name)) return false;
    await this.ctx.storage.put("names", [...names, name]);
    return true;
  }

  /** Returns false if the name wasn't on the list. */
  async removeName(name: string): Promise<boolean> {
    const names = await this.getNames();
    if (!names.includes(name)) return false;
    await this.ctx.storage.put(
      "names",
      names.filter((n) => n !== name),
    );
    return true;
  }
}

/** Fisher–Yates shuffle: every order equally likely. */
const shuffle = <T>(items: T[]): T[] => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

const HELP = [
  "*Labby commands*",
  "`/labby add <name>` add someone to the list",
  "`/labby remove <name>` remove someone",
  "`/labby shuffle` show the list in a random order",
].join("\n");

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
        const [subcommand = "", ...rest] = payload.text.trim().split(/\s+/);
        const name = rest.join(" ");
        const stub = env.MY_DURABLE_OBJECT.getByName("standup");

        let text = HELP;
        let inChannel = false;

        switch (subcommand) {
          case "add":
            if (!name) {
              text = "Usage: `/labby add <name>`";
              break;
            }
            text = (await stub.addName(name))
              ? `Added ${name}.`
              : `${name} is already on the list.`;
            break;

          case "remove":
            if (!name) {
              text = "Usage: `/labby remove <name>`";
              break;
            }
            text = (await stub.removeName(name))
              ? `Removed ${name}.`
              : `${name} isn't on the list.`;
            break;

          case "shuffle": {
            const names = await stub.getNames();
            if (names.length === 0) {
              text = "The list is empty. Add someone with `/labby add <name>`.";
            } else {
              text = shuffle(names)
                .map((n, i) => `${i + 1}. ${n}`)
                .join("\n");
              inChannel = true;
            }
            break;
          }
        }

        await context.respond({
          text,
          response_type: inChannel ? "in_channel" : "ephemeral",
        });
      },
    );

    return await app.run(request, ctx);
  },
};
