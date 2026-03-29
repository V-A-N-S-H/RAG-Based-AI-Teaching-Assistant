# import requests
# import os
# import json
# import pandas as pd
# import joblib

# def create_embedding(text_list):
#     # https://github.com/ollama/ollama/blob/main/docs/api.md#generate-embeddings
#     r = requests.post("http://localhost:11434/api/embed", json={
#         "model": "bge-m3",
#         "input": text_list
#     })
   
#     embedding = r.json()["embeddings"] 
#     return embedding


# jsons = os.listdir("newjsons")  # List all the jsons 
# my_dicts = []
# chunk_id = 0

# for json_file in jsons:
#     with open(f"newjsons/{json_file}") as f:
#         content = json.load(f)
#     print(f"Creating Embeddings for {json_file}")
#     embeddings = create_embedding([c['text'] for c in content['chunks']])
       
#     for i, chunk in enumerate(content['chunks']):
#         chunk['chunk_id'] = chunk_id
#         chunk['embedding'] = embeddings[i]
#         chunk_id += 1
#         my_dicts.append(chunk) 
# # print(my_dicts)

# df = pd.DataFrame.from_records(my_dicts)

# # Save this dataframe
# joblib.dump(df, 'embeddings.joblib')

# import requests
# import os
# import json
# import pandas as pd
# import numpy as np
# from sklearn.metrics.pairwise import cosine_similarity
# import joblib

# def create_embedding(text_list):
#     # https://github.com/ollama/ollama/blob/main/docs/api.md#generate-embeddings
#     r = requests.post("http://localhost:11434/api/embed", json={
#         "model": "bge-m3",
#         "input": text_list
#     })

#     embedding = r.json()["embeddings"] 
#     return embedding


# jsons = os.listdir("newjsons")  # List all the jsons 
# my_dicts = []
# chunk_id = 0

# for json_file in jsons:
#     with open(f"newjsons/{json_file}") as f:
#         content = json.load(f)
#     print(f"Creating Embeddings for {json_file}")
#     embeddings = create_embedding([c['text'] for c in content['chunks']])
       
#     for i, chunk in enumerate(content['chunks']):
#         chunk['chunk_id'] = chunk_id
#         chunk['embedding'] = embeddings[i]
#         chunk_id += 1
#         my_dicts.append(chunk) 
# # print(my_dicts)

# df = pd.DataFrame.from_records(my_dicts)
# # Save this dataframe
# joblib.dump(df, 'embeddings.joblib')

import requests
import os
import json
import pandas as pd
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity
import joblib

def create_embedding(text_list):
    """Create embeddings using Ollama's bge-m3 model"""
    if not text_list:
        return []
    
    try:
        r = requests.post("http://localhost:11434/api/embed", json={
            "model": "bge-m3",
            "input": text_list
        })
        r.raise_for_status()
        embedding = r.json()["embeddings"]
        return embedding
    except requests.exceptions.ConnectionError:
        print("❌ Error: Cannot connect to Ollama at localhost:11434. Make sure Ollama is running.")
        return None
    except Exception as e:
        print(f"❌ Error creating embedding: {e}")
        return None


def main():
    """Main function to process JSON chunks and create embeddings"""
    jsons = os.listdir("newjsons")  # List all the jsons 
    my_dicts = []
    chunk_id = 0

    for json_file in jsons:
        try:
            with open(f"newjsons/{json_file}") as f:
                content = json.load(f)
            print(f"Creating Embeddings for {json_file}")
            embeddings = create_embedding([c['text'] for c in content['chunks']])
            
            if embeddings is None:
                print(f"⚠️ Skipping {json_file}")
                continue
            
            for i, chunk in enumerate(content['chunks']):
                chunk['chunk_id'] = chunk_id
                chunk['embedding'] = embeddings[i]
                chunk_id += 1
                my_dicts.append(chunk) 
        except Exception as e:
            print(f"❌ Error processing {json_file}: {e}")
            continue

    df = pd.DataFrame.from_records(my_dicts)
    # Save this dataframe
    joblib.dump(df, 'embeddings.joblib')
    print(f"✅ Saved {len(df)} embeddings to embeddings.joblib")


if __name__ == "__main__":
    main()
