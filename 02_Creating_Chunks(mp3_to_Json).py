import os
import json
import whisper

model = whisper.load_model("large-v2")

audios = os.listdir("Audios")

for audio_file in audios:
    # print(audio_file)
    if("_" in audio_file):
        Number = audio_file.split("_")[0]
        Title = audio_file.split("_")[1].split(".")[0]
        print(Number, Title)

        result = model.transcribe(audio = f"Audios/{audio_file}",
        # result = model.transcribe(audio = f"Audios/sample.mp3",
                                    language = "hi",
                                    task = "translate",
                                    word_timestamps=False)
        
        chunks = []
        for segment in result["segments"]:
            chunks.append({"Number": Number,
                           "Title": Title,
                           "Start": segment["start"],
                           "End": segment["end"],
                           "Text": segment["text"]})
            
        chunks_with_metadata = {"chunks": chunks,
                                "text": result["text"]}
            
        with open (f"jsons/{audio_file}.json", 'w') as f:
            json.dump(chunks_with_metadata, f)

        
