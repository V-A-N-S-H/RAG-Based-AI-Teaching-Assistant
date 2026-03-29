import pandas as pd
import requests
from sklearn.metrics.pairwise import cosine_similarity
# from read_chunks import create_embedding
import joblib
import numpy as np

def create_embedding(text_list):
    # https://github.com/ollama/ollama/blob/main/docs/api.md#generate-embeddings
    r = requests.post("http://localhost:11434/api/embed", json={
        "model": "bge-m3",
        "input": text_list
    })

    embedding = r.json()["embeddings"] 
    return embedding

df = joblib.load('embeddings.joblib')

incoming_query = input("Ask your question: ")
question_embedding = create_embedding([incoming_query])[0]

similarites = cosine_similarity(np.vstack(df['embedding']), [question_embedding]).flatten()
# print(similarites)
top_result = 5
max_index = similarites.argsort()[::-1][0:top_result]
# print(max_index)
new_df = df.loc[max_index]
# print(new_df[['title', 'number', 'text']])

prompt = f"""Here are the video chunks containing video title, video, start time in seconds, end time in seconds, the text at the time stamp:

{new_df[["title", "number", "start", "end", "text"]].to_json()}
----------------------------------------------
"{incoming_query}"

user asked this question related to the video chunks, you have to answer where and how much content is taught inw which video (in which video and at what timestamp) ang guide the user to go to that particular video. if user asked unrelated questions, tell him that you can only answer realted to the course
"""

with open("prompt.txt", "w") as f:
    f.write(prompt)


# for index, item in new_df.iterrows():
#     print(f"Title: {item['title']}")
#     print(f"Chapter Number: {item['number']}")
#     print(f"Text: {item['text']}")
#     print(f"start : {item['start']}, end : {item['end']}")
#     print("\n---\n")