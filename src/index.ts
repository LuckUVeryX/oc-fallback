import { Model, Plugin } from "@opencode/plugin/effect"
import type { SessionRequestKind } from "@opencode/plugin/effect/session"
import { Effect, Schema } from "effect"

const Options = Schema.Struct({
  fallbacks: Schema.optionalKey(Schema.Record(Schema.String, Schema.String)),
})

export function modelKey(ref: Model.Ref): string {
  return `${ref.providerID}/${ref.id}`
}

export function decodeFallbacks(input: unknown): Map<string, Model.Ref> {
  const options = Schema.decodeUnknownSync(Options)(input)
  const fallbacks = new Map<string, Model.Ref>()
  for (const [primary, fallback] of Object.entries(options.fallbacks ?? {})) {
    fallbacks.set(modelKey(Model.Ref.parse(primary)), Model.Ref.parse(fallback))
  }
  return fallbacks
}

export function fallbackFor(input: {
  readonly errorType: string
  readonly kind: SessionRequestKind | undefined
  readonly model: Model.Ref
  readonly fallbacks: ReadonlyMap<string, Model.Ref>
}): Model.Ref | undefined {
  if (input.errorType !== "provider.free-limit" || input.kind !== "primary") return undefined
  const destination = input.fallbacks.get(modelKey(input.model))
  if (destination === undefined) return undefined
  return {
    providerID: destination.providerID,
    id: destination.id,
    ...(input.model.variant === undefined ? {} : { variant: input.model.variant }),
  }
}

export default Plugin.define({
  id: "oc-fallback",
  effect: (ctx) =>
    Effect.gen(function* () {
      const fallbacks = yield* Effect.try(() => decodeFallbacks(ctx.options)).pipe(Effect.orDie)
      if (fallbacks.size === 0) return yield* Effect.logInfo("oc-fallback: no fallbacks configured")

      const kinds = new Map<string, SessionRequestKind>()

      yield* ctx.session.hook("model.request", (event) =>
        Effect.sync(() => {
          kinds.set(event.sessionID, event.kind)
        }),
      )

      yield* ctx.session.hook("retry", (event) => {
        const fallback = fallbackFor({
          errorType: event.error.type,
          kind: kinds.get(event.sessionID),
          model: event.model,
          fallbacks,
        })
        if (fallback === undefined) return Effect.void

        return ctx.session.switchModel({ sessionID: event.sessionID, model: fallback }).pipe(
          Effect.tap(() =>
            Effect.sync(() => {
              event.decision = { retry: true, delay: 0 }
            }),
          ),
          Effect.catch((error) =>
            Effect.logError(`oc-fallback: failed to switch session ${event.sessionID}: ${String(error)}`),
          ),
        )
      })

      yield* Effect.logInfo(`oc-fallback: installed ${fallbacks.size} fallback(s)`)
    }),
})
