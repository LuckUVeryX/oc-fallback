import { describe, expect, it } from "bun:test"
import { Model } from "@opencode/plugin/effect"
import type { SessionRequestKind } from "@opencode/plugin/effect/session"
import { decodeFallbacks, fallbackFor, modelKey } from "../src/index.ts"

const fallbacks = decodeFallbacks({
  fallbacks: {
    "opencode/deepseek-v4.1-flash-free": "opencode-go/deepseek-v4.1-flash",
  },
})

describe("decodeFallbacks", () => {
  it("maps each primary model to its fallback", () => {
    expect(fallbacks.get("opencode/deepseek-v4.1-flash-free")).toEqual(
      Model.Ref.parse("opencode-go/deepseek-v4.1-flash"),
    )
  })

  it("treats an omitted variant and #default as the same primary", () => {
    const mapped = decodeFallbacks({ fallbacks: { "a/b#default": "c/d" } })
    expect(mapped.get(modelKey(Model.Ref.parse("a/b")))).toEqual(Model.Ref.parse("c/d"))
  })

  it("treats different variants as the same primary model", () => {
    expect(modelKey(Model.Ref.parse("a/b#high"))).toBe(modelKey(Model.Ref.parse("a/b#max")))
  })

  it("rejects a malformed reference", () => {
    expect(() => decodeFallbacks({ fallbacks: { "not-a-ref": "c/d" } })).toThrow("Invalid model reference")
  })
})

describe("fallbackFor", () => {
  function decide(input: {
    readonly errorType?: string
    readonly kind?: SessionRequestKind | undefined
    readonly model?: string
  }): Model.Ref | undefined {
    return fallbackFor({
      errorType: input.errorType ?? "provider.free-limit",
      kind: "kind" in input ? input.kind : "primary",
      model: Model.Ref.parse(input.model ?? "opencode/deepseek-v4.1-flash-free"),
      fallbacks,
    })
  }

  it("switches only on the exact provider.free-limit error", () => {
    for (const errorType of ["provider.quota", "provider.rate-limit", "provider.budget-limit", "unknown"]) {
      expect(decide({ errorType })).toBeUndefined()
    }
  })

  it("switches only for a recorded primary request", () => {
    for (const kind of ["compaction", "title", "generate", undefined] as const) {
      expect(decide({ kind })).toBeUndefined()
    }
  })

  it("returns the configured fallback only for a mapped model", () => {
    expect(decide({})).toEqual(Model.Ref.parse("opencode-go/deepseek-v4.1-flash"))
    expect(decide({ model: "opencode/other" })).toBeUndefined()
  })

  it("uses the same fallback for every variant and preserves the failed request's variant", () => {
    expect(decide({ model: "opencode/deepseek-v4.1-flash-free#high" })).toEqual(
      Model.Ref.parse("opencode-go/deepseek-v4.1-flash#high"),
    )
    expect(decide({ model: "opencode/deepseek-v4.1-flash-free#max" })).toEqual(
      Model.Ref.parse("opencode-go/deepseek-v4.1-flash#max"),
    )
  })

  it("keeps an omitted variant omitted and an explicit #default", () => {
    const omitted = decide({})
    expect(omitted).toEqual(Model.Ref.parse("opencode-go/deepseek-v4.1-flash"))
    expect(omitted).not.toHaveProperty("variant")
    expect(decide({ model: "opencode/deepseek-v4.1-flash-free#default" })).toEqual(
      Model.Ref.parse("opencode-go/deepseek-v4.1-flash#default"),
    )
  })

  it("ignores a configured fallback variant", () => {
    const configured = decodeFallbacks({ fallbacks: { "a/b": "c/d#high" } })
    const result = fallbackFor({
      errorType: "provider.free-limit",
      kind: "primary",
      model: Model.Ref.parse("a/b#max"),
      fallbacks: configured,
    })
    expect(result).toEqual(Model.Ref.parse("c/d#max"))
  })
})
