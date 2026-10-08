# remotion-engine — Round 2 — Audio Pipeline — Design

Ngày: 2026-10-09
Trạng thái: thiết kế đã duyệt, chưa triển khai
Repo: [remotion-engine](.) (tiếp nối [Round 1](2026-10-09-remotion-engine-round1-design.md), đã merge vào `main`)

## 1. Bối cảnh và mục tiêu

Sau khi render video demo bằng Round 1, phản hồi thực tế: "nền đen, không có SFX, không có TTS". Round 1 chỉ **phát** file âm thanh có sẵn qua `audio.voiceOver`/`audio.music` (§6 design Round 1) — không tự sinh gì. Round 2 lấp đúng khoảng trống đó: thêm khả năng **tự sinh giọng đọc (TTS) và nhạc nền/SFX**, để một `video-spec.json` không cần người dùng tự thu âm/tìm nhạc trước mới render được.

### Ngoài phạm vi Round 2

Các tiểu-hệ-thống hình ảnh còn treo từ Round 1 (chart/map/camera-3D/nhân vật/hoạt hình vẽ tay/sơ đồ node/mockup UI), AI Director, Template presets, tích hợp `auto-gg-flow` — vẫn để Round sau, không liên quan phạm vi audio này.

"Nền đen" (phản hồi thứ 3) không xử lý ở Round này — đó là `style.backgroundColor` mặc định của Round 1, một lựa chọn thẩm mỹ riêng, không phải thiếu tính năng audio. Sẽ xem lại khi có nhu cầu cụ thể (vd. thêm ảnh nền cho scene text/quote).

## 2. Nguồn text cho TTS

Thêm `narration?: string` vào mọi scene (`sceneBaseSchema`), **độc lập** với text hiển thị trên màn hình (`scene.text.content`). Một scene `image`/`video`/`quote`/`code` không có chữ hiển thị vẫn có thể có lời đọc; một scene `text` có thể hiển thị tiêu đề ngắn nhưng đọc một câu dài hơn.

## 3. Schema thay đổi (`src/schemas/video-spec.ts`)

```ts
// sceneBaseSchema: thêm 1 field
narration: z.string().optional(),

// audioSchema: sửa lại toàn bộ
const musicGenerateSchema = z.object({
  generate: z.literal(true),
  mood: z.enum(["ambient", "upbeat", "tense", "calm"]),
});

const audioSchema = z.object({
  voiceOver: z.string().optional(), // vẫn giữ — file lồng tiếng toàn video có sẵn (Round 1), độc lập với narration per-scene
  voice: z.string().default("vi-VN-HoaiMyNeural"), // giọng Edge TTS dùng cho mọi narration trong video này
  music: z.union([z.string(), musicGenerateSchema]).optional(),
  musicVolume: z.number().min(0).max(1).default(0.15),
  sfx: z.boolean().default(true), // tự thêm SFX theo transition — tắt bằng false nếu không muốn
});
```

`voiceOver` (file có sẵn, toàn video) và `narration` (text, tự sinh, theo từng scene) là hai cơ chế độc lập — dùng cái nào tùy spec, có thể dùng cả hai cùng lúc (vd. `voiceOver` là nhạc dẫn chương trình, `narration` là chữ phụ đề từng scene) nhưng trường hợp phổ biến nhất là chỉ dùng một trong hai.

## 4. `engine/AudioResolver.ts` — module mới

Giống tinh thần `AssetResolver` (Round 1): hàm thuần, Node-only, nhận root + id + spec, trả về spec đã "resolve" xong — mọi đường dẫn audio trong kết quả là file **thật đã tồn tại trên đĩa**, mọi `scene.duration` đã **khớp với narration thật** (nếu có).

```ts
export type ResolvedScene = Scene & { narrationAudioPath?: string };
export type ResolvedVideoSpec = Omit<VideoSpec, "scenes" | "audio"> & {
  scenes: ResolvedScene[];
  audio: Omit<VideoSpec["audio"], "music"> & {
    music?: string; // luôn là đường dẫn file thật sau resolve, dù spec gốc khai báo string hay {generate}
    sfxPaths: Partial<Record<TransitionConfig["type"], string>>; // chỉ chứa các type thực sự xuất hiện trong video này
  };
};

export async function resolveAudio(root: string, id: string, spec: VideoSpec): Promise<ResolvedVideoSpec>;
```

(`Omit<..., "music">` rồi khai lại — tránh lỗi kiểu giao `(string | MusicGenerate) & string` không rõ nghĩa; field `music` sau resolve chỉ còn đúng 1 kiểu: `string | undefined`.)

### 4.1. TTS cho narration

Với mỗi scene có `narration`:
1. Cache key = hash SHA-256 ngắn của `narration + audio.voice`.
2. File đích: `videos/<id>/assets/generated/tts-<key>.mp3`. Nếu đã tồn tại → dùng lại, **không gọi TTS lại** (tiết kiệm, và để spec không đổi hành vi mỗi lần render).
3. Nếu chưa có: gọi Edge TTS (`msedge-tts`, dùng lại đúng cách `short-video-engine` đã làm — `setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3, {wordBoundaryEnabled:true, sentenceBoundaryEnabled:true})` rồi `toFile(dir, text)`), lưu file mp3.
4. **Không cần đo file riêng** — `toFile` trả kèm `metadataFilePath`, file JSON này chứa mảng `Metadata` với các item `WordBoundary`/`SentenceBoundary`, mỗi item có `Data.Offset`/`Data.Duration` theo tick .NET (100ns/tick). Lấy `max(Offset + Duration)` trong toàn bộ item rồi chia 10_000 ra số ms — đây chính là thời lượng thật của audio, đã verify bằng lệnh thật (câu tiếng Việt mẫu "Một engine, nhiều video là dữ liệu." → 3650ms, voice `vi-VN-HoaiMyNeural` xác nhận tồn tại thật, status GA).
5. Nếu thời lượng thật > `scene.duration` khai báo trong spec gốc → set `scene.duration = ceil((thời lượng thật + 0.2) * 10) / 10` (cộng đệm 0.2s cuối câu rồi làm tròn lên bậc 0.1s — công thức cố định, không mơ hồ).
6. Gán `narrationAudioPath` = đường dẫn **tương đối từ `videos/<id>/`** (vd. `"assets/generated/tts-ab12cd.mp3"`) — cùng quy ước với `scene.src`/`audio.music` hiện có, để `Video.tsx` gọi `staticFile(scene.narrationAudioPath)` giống mọi field đường dẫn khác, không cần nhánh xử lý riêng.

Sau khi xử lý hết các scene, nếu có scene nào bị đổi `duration`, tính lại `settings.duration = sum(scene.duration)` để khớp — logic giống `validate-video.ts` đang kiểm tra, chỉ khác là bây giờ chính `resolveAudio` là nơi làm cho nó khớp, không chỉ kiểm tra.

### 4.2. Nhạc nền tự sinh

Nếu `audio.music` là `{generate: true, mood}`:
1. Cache key = `mood + tổng settings.duration (sau khi đã resolve TTS ở bước 4.1)`.
2. File đích: `videos/<id>/assets/generated/music-<mood>-<durationSec>.wav`.
3. Nếu chưa có: gọi `src/audio/synthesizeMusic.ts` sinh track WAV đúng độ dài, cache lại.
4. Gán `audio.music` (trong spec trả về) = đường dẫn file WAV đó — từ điểm nhìn của `Video.tsx`, nó chỉ là một file audio bình thường như Round 1, không biết/không cần biết nó được tự sinh.

Nếu `audio.music` là string (đường dẫn file có sẵn, như Round 1) → giữ nguyên, không sinh gì.

### 4.3. SFX theo transition

Nếu `audio.sfx !== false`: với mỗi transition thật sự xảy ra giữa 2 scene liên tiếp (`transition.type !== "none"`):
1. Cache key = chỉ phụ thuộc `transition.type` (SFX không phụ thuộc thời lượng cụ thể — file ngắn, cố định theo loại).
2. File đích: `videos/<id>/assets/generated/sfx-<type>.wav`. Cache key không phụ thuộc `id` hay thời lượng nên nội dung file giống nhau giữa các video, nhưng cố ý lưu riêng trong từng `videos/<id>/` (không dùng 1 thư mục chung toàn repo) — để một video là một đơn vị tự chứa, xoá cả thư mục `videos/<id>/` là xoá sạch mọi thứ nó cần, không để lại phụ thuộc chéo.
3. Nếu chưa có: gọi `src/audio/synthesizeSfx.ts` sinh WAV ngắn theo `transition.type`, cache lại.
4. Lưu map `sfxPaths: Record<TransitionType, string>` cho các type thực sự xuất hiện trong video này — `Video.tsx` dùng map này khi lắp `<Audio>` SFX vào đúng vị trí.

## 5. Tổng hợp WAV bằng code thuần (`src/audio/wav.ts`)

Không dùng ffmpeg hay thư viện audio nặng — viết trực tiếp buffer PCM 16-bit mono vào header WAV chuẩn (44 byte), vì format đơn giản và không cần phụ thuộc ngoài:

```ts
export function encodeWav(samples: Float32Array, sampleRate: number): Buffer;
```

`samples` là mảng biên độ [-1, 1] — `synthesizeMusic`/`synthesizeSfx` chỉ cần tính toán mảng số thực này, `encodeWav` lo phần đóng gói byte. Hàm này test được trực tiếp: kiểm tra header `RIFF`/`WAVE`/`data`, kiểm tra kích thước buffer đúng công thức `44 + samples.length * 2`.

## 6. Synth nhạc nền (`src/audio/synthesizeMusic.ts`)

Giữ đơn giản có chủ đích — đây không phải nhạc nền chất lượng phát hành, chỉ đủ để video không bị im lặng hoàn toàn, không vi phạm bản quyền (toàn bộ sinh bằng toán học, không sample/loop nhạc thật):

| Mood | Cách tạo |
|---|---|
| `ambient` | 2 sóng sine tần số thấp cách nhau một quãng 5 (vd. 110Hz + 165Hz), biên độ dao động chậm (LFO ~0.1Hz) tạo cảm giác "thở" |
| `calm` | 1 sóng sine đơn, biên độ tăng/giảm rất chậm, không có nhịp |
| `upbeat` | Thêm một lớp xung tam giác lặp theo nhịp cố định (~120 BPM) chồng lên pad sine nền |
| `tense` | 2 sóng sine lệch nhau nửa cung (tạo phách/beat frequency khó chịu nhẹ) + tremolo nhanh hơn ambient |

Mọi track fade-in/fade-out 0.3s ở đầu/cuối để tránh tiếng click khi cắt.

## 7. Synth SFX (`src/audio/synthesizeSfx.ts`)

| Transition type | SFX (~0.3–0.5s) |
|---|---|
| `fade` | Sine swell êm, biên độ tăng rồi giảm hình chuông |
| `slide` | Noise lọc dải tần quét từ thấp lên cao (whoosh) |
| `wipe` | Noise burst ngắn + lọc highpass (click/schwing) |
| `zoom` | Sine quét pitch từ thấp lên cao nhanh (rising blip) |
| `blur` | Noise lọc lowpass êm, biên độ thấp (airy) |

## 8. Tích hợp CLI

`validate-video.ts`, `preview-video.ts`, `render-video.ts` đều gọi `resolveAudio(root, id, spec)` ngay sau khi `videoSpecSchema.parse` — trước khi dùng spec cho bất kỳ việc gì khác. `validate` dùng kết quả để báo tổng thời lượng **sau khi** đã tính narration (có thể khác số trong file spec gốc — in rõ nếu có chênh lệch, vd. `"[validate] demo: OK — settings.duration gốc 8s, sau khi tính narration thực tế: 9.4s"`).

**Sửa quan trọng ở `Root.tsx`**: `calculateMetadata` ở Round 1 gọi `videoSpecSchema.parse(props.spec)` để tính frame — nhưng nếu giữ nguyên, nó sẽ **âm thầm xoá** `narrationAudioPath` (trên từng scene) và `sfxPaths` (trong `audio`), vì đây là field chỉ tồn tại sau `resolveAudio`, không khai báo trong `videoSpecSchema` gốc, và zod mặc định strip field lạ khi parse qua object schema. Round 2 đổi `Props` của `calculateMetadata` thành `{ spec: ResolvedVideoSpec }` và **bỏ hẳn lệnh `.parse()`** trong đó — chỉ đọc trực tiếp `props.spec.settings` để tính `durationInFrames`, tin tưởng props đầu vào đã hợp lệ (vì `render`/`preview` đã validate + resolve trước khi truyền vào). An toàn kiểu vẫn giữ được qua TypeScript (`ResolvedVideoSpec`), không cần zod ở bước này nữa.

## 9. `Video.tsx` — lắp audio vào timeline

Prop type đổi từ `spec: VideoSpec` sang `spec: ResolvedVideoSpec` — mọi nơi dùng `spec.scenes[i]`/`spec.audio` bên trong đã là dữ liệu đã resolve (audio path thật, duration đã chỉnh), không phải spec gốc người dùng viết tay.

- **Narration**: mỗi scene có `narrationAudioPath` → thêm `<Audio src={staticFile(...)} />` làm sibling của `<SceneRenderer>` bên trong đúng `TransitionSeries.Sequence` của scene đó (tự động đồng bộ thời điểm nhờ nằm trong cùng Sequence).
- **Nhạc nền**: như Round 1, một `<Audio>` toàn video, không đổi.
- **SFX**: nằm **ngoài** `TransitionSeries` (vì `TransitionSeries` tự quản lý frame number riêng cho con của nó, không tiện chèn audio theo mốc thời gian tuyệt đối). Với mỗi transition thực tế giữa scene `i` và `i+1`: tính `frameOffset = (tổng durationInFrames của scene 0..i) - transitionDurationInFrames`, rồi render `<Sequence from={frameOffset} durationInFrames={sfxDurationInFrames}><Audio src={staticFile(sfxPaths[type])} /></Sequence>` tại cấp `AbsoluteFill` ngoài cùng.

## 10. Testing

Theo đúng ranh giới đã thống nhất ở Round 1 (§9 design Round 1): logic thuần có test, cảm quan "nghe có hay không" verify bằng tay.

- `src/audio/wav.test.ts` — `encodeWav` tạo đúng header, đúng kích thước buffer.
- `src/audio/synthesizeMusic.test.ts` — mỗi mood trả về `Float32Array` đúng độ dài (`durationSec * sampleRate`), giá trị trong khoảng [-1, 1], có fade-in/out (mẫu đầu/cuối gần 0).
- `src/audio/synthesizeSfx.test.ts` — mỗi type trả về mảng độ dài hợp lý (0.2–0.6s tương ứng sampleRate), không rỗng.
- `src/engine/AudioResolver.test.ts` — mock TTS call (không gọi Edge TTS thật trong test) và mock đo thời lượng, kiểm tra: cache key ổn định (cùng input → cùng key), file đã tồn tại thì không gọi generator lại, `scene.duration` được nâng đúng khi narration dài hơn, `settings.duration` được tính lại đúng tổng.
- Task cuối (giống Task 19 Round 1): render thật 1 video có narration + nhạc nền generate + SFX, nghe bằng tai xác nhận không có SFX ở transition "none", có SFX đúng loại ở các transition khác, giọng đọc không bị cắt ngang.

## 11. Dependencies mới

- `msedge-tts` — TTS miễn phí qua Edge. Đã verify thật trong lúc viết plan: `getVoices()` xác nhận `vi-VN-HoaiMyNeural` (nữ) và `vi-VN-NamMinhNeural` (nam) tồn tại, status GA; synth thử câu tiếng Việt thành công, lấy được `durationMs` chính xác từ metadata trả về — **không cần thêm `music-metadata`** như spec bản đầu dự tính, bỏ hẳn dependency đó.

Không thêm ffmpeg hay binary native nào khác — giữ đúng triết lý Round 1 (chỉ `remotion`, `zod`, Node core).

## 12. Cần xác minh thật lúc viết plan

- ✅ **Tên giọng Edge TTS tiếng Việt** — verify xong (mục 11).
- ✅ **Lấy duration từ metadata, không cần đo file riêng** — verify xong (mục 4.1), loại bỏ `music-metadata`.
- ⏳ **Công thức `frameOffset` cho SFX**: `(tổng durationInFrames scene 0..i) - transitionDurationInFrames` là suy luận từ cách `TransitionSeries` chồng frame giữa 2 scene liên tiếp (đã verify cấu trúc `Sequence`/`Transition` ở Round 1, nhưng chưa verify công thức offset tuyệt đối này bằng cách render thử và so khớp thời điểm nghe SFX với thời điểm thấy transition). Plan cần có bước render thật 1 case có SFX rồi nghe/xem đối chiếu thời điểm trước khi coi là đúng.
