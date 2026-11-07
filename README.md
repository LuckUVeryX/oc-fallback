# oc-fallback

Status: foundation only. The plugin is not implemented and not published.

`oc-fallback` is a planned OpenCode V2 plugin for one routing policy. It maps an existing primary model to an existing fallback model. When OpenCode reports the exact `provider.free-limit` failure before visible output, the plugin switches the session to the fallback and lets OpenCode retry the same step.

The switch is a real session model change. It is visible in the session and stays selected until the user chooses another model.

## Planned configuration

The shape below is the design target. It does not work yet.

```jsonc
{
  "plugins": [
    {
      "package": "oc-fallback",
      "options": {
        "routes": {
          "fast-coding": {
            "primary": "opencode/grok-code",
            "fallback": "anthropic/claude-sonnet-4-5"
          }
        }
      }
    }
  ]
}
```

The route name is a configuration label. It is not a model and does not appear in the model picker.

Model references must match the user's selected model exactly. A reference with a `#variant` suffix matches only that variant.

## Planned behavior

- The plugin reacts to `provider.free-limit` and no other failure. A generic 429, authentication failure, context error, transport error, or paid balance error is left to OpenCode.
- The plugin switches the model only before text, reasoning, or tool output starts. A failure after output stays on the primary.
- Compaction, title, and generate requests do not trigger a switch.
- A fallback is terminal. It cannot match another route and cannot start a second hop.
- A failed fallback stays visible. The plugin does not loop back to the primary.
- The plugin does not read or copy credentials. OpenCode resolves the fallback connection through its normal provider path.
- The plugin does not proxy provider traffic or replace provider responses.

## Non-goals

- No synthetic catalog model, alias, or virtual provider.
- No cooldown state.
- No automatic restore to the primary.
- No chained fallback routes.
- No accounting claim beyond the model recorded by OpenCode for each attempt.

## Development target

The implementation targets the installed host line:

- OpenCode v2.2.5
- Bun 1.4.4
- `@opencode/plugin` 2.2.5
- `effect` 4.0.6

`@opencode/plugin` and `effect` stay external at runtime.

## Verification plan

The proof will load the packed plugin into an isolated OpenCode v2.2.5 process and drive deterministic provider fixtures. The run uses its own `HOME`, XDG config, data, cache, and state directories, so it does not inherit the user's providers, MCP servers, or instructions. It does not start or restart a shared OpenCode server, and it does not consume real provider quota.

## What exists now

Design evidence and the project foundation. Source, tests, the verification harness, and release packaging are not present yet.

## License

MIT. See [LICENSE](LICENSE).
