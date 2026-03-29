# Coverting videos to mp3 format

import os
import subprocess

files = os.listdir("Videos")

for file in files:
    # print(file)
    tutorial_name = file.split("  ")[0]
    tutorial_number = file.split(".")[0].split(" #")[1].zfill(2)   # zfill = Pads a string with leading zeros (0) until it reaches a given length
    # print(tutorial_name)
    # print(tutorial_number)
    print(tutorial_number + " : " + tutorial_name)
    subprocess.run(["ffmpeg", "-i", f"Videos/{file}", f"Audios/{tutorial_number}_{tutorial_name}.mp3"])