import { SettingsForm } from "../../components/settings-form";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">
          设置
        </p>
        <h2 className="mt-2 text-3xl font-semibold text-zinc-50">
          模型配置
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          当前支持双通道接入：文本规划可走灵鹿网关，图像和视频生成继续走官方 OpenAI。
        </p>
      </div>

      <SettingsForm />
    </div>
  );
}
