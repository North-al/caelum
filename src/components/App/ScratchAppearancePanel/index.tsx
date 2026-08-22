import { RotateCcw } from "lucide-react"

import type { ScratchAppearance, ScratchPresetId } from "~/lib/scratch-appearance"
import {
  isAppearanceTweaked,
  presetPreviewStyle,
  restoreAppearanceDefaults,
  SCRATCH_PRESET_DESC,
  SCRATCH_PRESET_LABELS,
  SCRATCH_PRESET_ORDER,
  SCRATCH_PRESETS,
} from "~/lib/scratch-appearance"
import { cn } from "~/lib/utils"

interface Props {
  appearance: ScratchAppearance
  onChange: (next: ScratchAppearance) => void
  onClose: () => void
}

type TweakKey = "opacity" | "blur" | "radius"

export const ScratchAppearancePanel = ({ appearance, onChange, onClose }: Props) => {
  const applyPreset = (id: ScratchPresetId) => {
    onChange({ ...SCRATCH_PRESETS[id] })
  }

  const patchTweak = (key: TweakKey, value: number) => {
    onChange({
      ...appearance,
      [key]: value,
    })
  }

  const tweaked = isAppearanceTweaked(appearance)

  return (
    <div className="scratch-style">
      <header className="scratch-style-header">
        <div>
          <h2 className="scratch-style-title">便签样式</h2>
          <p className="scratch-style-subtitle">预设即完整主题，下方仅微调质感</p>
        </div>
        <button type="button" className="scratch-style-close" aria-label="返回" onClick={onClose}>
          ×
        </button>
      </header>

      <div className="scratch-style-body">
        <section className="scratch-style-block">
          <p className="scratch-style-block-title">风格预设</p>
          <div className="scratch-style-preset-grid">
            {SCRATCH_PRESET_ORDER.map((id) => {
              const preset = SCRATCH_PRESETS[id]
              const active = appearance.preset === id
              return (
                <button
                  key={id}
                  type="button"
                  className={cn("scratch-style-preset-chip", active && "is-active")}
                  title={SCRATCH_PRESET_DESC[id]}
                  onClick={() => applyPreset(id)}
                >
                  <span className="scratch-style-preset-preview" style={presetPreviewStyle(preset)} />
                  <span className="scratch-style-preset-name">{SCRATCH_PRESET_LABELS[id]}</span>
                </button>
              )
            })}
          </div>
        </section>

        <section className="scratch-style-card">
          <div className="scratch-style-card-head">
            <p className="scratch-style-card-title">质感调节</p>
            {tweaked ? (
              <button
                type="button"
                className="scratch-style-restore"
                onClick={() => onChange(restoreAppearanceDefaults(appearance))}
              >
                <RotateCcw className="size-3" />
                恢复默认
              </button>
            ) : null}
          </div>
          <div className="scratch-style-meter">
            <div className="scratch-style-meter-head">
              <span>透明度</span>
              <span>{Math.round(appearance.opacity * 100)}%</span>
            </div>
            <input
              type="range"
              min={0.15}
              max={0.98}
              step={0.01}
              value={appearance.opacity}
              className="scratch-style-range"
              onChange={(event) => patchTweak("opacity", Number(event.target.value))}
            />
          </div>
          <div className="scratch-style-meter">
            <div className="scratch-style-meter-head">
              <span>背景模糊</span>
              <span>{Math.round(appearance.blur)}</span>
            </div>
            <input
              type="range"
              min={0}
              max={36}
              step={1}
              value={appearance.blur}
              className="scratch-style-range"
              onChange={(event) => patchTweak("blur", Number(event.target.value))}
            />
          </div>
          <div className="scratch-style-meter">
            <div className="scratch-style-meter-head">
              <span>圆角</span>
              <span>{appearance.radius}px</span>
            </div>
            <input
              type="range"
              min={0}
              max={16}
              step={1}
              value={appearance.radius}
              className="scratch-style-range"
              onChange={(event) => patchTweak("radius", Number(event.target.value))}
            />
          </div>
        </section>
      </div>
    </div>
  )
}
