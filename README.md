# oc-fallback

OpenCode V2 plugin for model fallback. When the selected primary model returns the exact `provider.free-limit` error, the plugin switches the session to a configured fallback and lets OpenCode retry.

## Install

Add the plugin to your OpenCode config:

```json
{
  "plugins": [
    {
      "package": "github:LuckUVeryX/oc-fallback",
      "options": {
        "fallbacks": {
          "opencode/deepseek-v4.1-flash-free": "opencode-go/deepseek-v4.1-flash"
        }
      }
    }
  ]
}
```

`options.fallbacks` maps each primary model to one fallback model by `provider/model`, ignoring any `#variant` suffix. The failed request's variant carries over unchanged, so `provider/model#high` and `provider/model#max` share one mapping and keep their own variant after the switch. You do not configure variants. The plugin does not validate, translate, or check support for the carried variant; if the fallback does not support it, the provider request fails as usual. Both models must exist with working credentials.

OpenCode loads `src/index.ts` directly. The package is not published to npm.

## Behavior

- Only the exact `provider.free-limit` error triggers a switch. Other errors stay untouched.
- The latest request for the session must be a primary request for the failed model. Title, generate, and compaction requests do not trigger a switch.
- The switched model stays selected until you choose another model or another mapped free-limit switches it. The plugin keeps no cooldown state and does not restore a previous model.
- Retries, streaming, tools, and provider traffic stay on OpenCode's normal path.

## Test

```sh
bun install
bun test
```

`bun test` runs the unit tests only. There is no compiler check, CI, build, dist, or standalone testing.

## License

MIT. See [LICENSE](LICENSE).
