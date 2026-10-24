import os
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from app.core.config import settings
from app.core.logging import logger

class BaseVectorStore(ABC):
    @abstractmethod
    def add_chunks(
        self,
        ids: List[str],
        embeddings: List[List[float]],
        documents: List[str],
        metadatas: List[Dict[str, Any]]
    ) -> None:
        pass

    @abstractmethod
    def query(
        self,
        query_embedding: List[float],
        n_results: int = 10,
        where_filter: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        pass

    @abstractmethod
    def delete_by_document(self, document_id: str) -> None:
        pass

class ChromaVectorStore(BaseVectorStore):
    def __init__(self, collection_name: str = "continuum_knowledge"):
        self.collection_name = collection_name
        self.client = None
        self.collection = None
        self._initialize_chroma()

    def _initialize_chroma(self):
        try:
            import chromadb
            from chromadb.config import Settings as ChromaSettings

            if settings.CHROMA_URL:
                # Remote ChromaDB server
                logger.info(f"Connecting to ChromaDB server at {settings.CHROMA_URL}")
                host_port = settings.CHROMA_URL.replace("http://", "").replace("https://", "").split(":")
                host = host_port[0]
                port = int(host_port[1]) if len(host_port) > 1 else 8000
                self.client = chromadb.HttpClient(host=host, port=port)
            else:
                # Persistent local ChromaDB storage
                persist_path = settings.resolved_chroma_dir
                os.makedirs(persist_path, exist_ok=True)
                logger.info(f"Initializing local ChromaDB client at {persist_path}")
                self.client = chromadb.PersistentClient(path=persist_path)

            self.collection = self.client.get_or_create_collection(
                name=self.collection_name,
                metadata={"hnsw:space": "cosine"}
            )
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB ({e}). Falling back to memory storage.")
            self._in_memory_store = {}

    def add_chunks(
        self,
        ids: List[str],
        embeddings: List[List[float]],
        documents: List[str],
        metadatas: List[Dict[str, Any]]
    ) -> None:
        if not ids:
            return

        # Sanitize metadata for Chroma (Chroma requires string, int, float, bool)
        clean_metadatas = []
        for m in metadatas:
            clean_m = {}
            for k, v in m.items():
                if v is None:
                    continue
                if isinstance(v, (str, int, float, bool)):
                    clean_m[k] = v
                else:
                    clean_m[k] = str(v)
            clean_metadatas.append(clean_m)

        if self.collection:
            try:
                self.collection.upsert(
                    ids=ids,
                    embeddings=embeddings,
                    documents=documents,
                    metadatas=clean_metadatas
                )
                logger.info(f"Upserted {len(ids)} chunks to ChromaDB collection '{self.collection_name}'")
                return
            except Exception as e:
                logger.error(f"Error upserting chunks to ChromaDB: {e}")

        # Fallback memory store
        if not hasattr(self, "_in_memory_store"):
            self._in_memory_store = {}
        for i, doc_id in enumerate(ids):
            self._in_memory_store[doc_id] = {
                "embedding": embeddings[i],
                "document": documents[i],
                "metadata": clean_metadatas[i]
            }

    def query(
        self,
        query_embedding: List[float],
        n_results: int = 10,
        where_filter: Optional[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        results: List[Dict[str, Any]] = []

        if self.collection:
            try:
                chroma_where = None
                if where_filter:
                    active_filters = [{k: v} for k, v in where_filter.items() if v is not None]
                    if len(active_filters) == 1:
                        chroma_where = active_filters[0]
                    elif len(active_filters) > 1:
                        chroma_where = {"$and": active_filters}

                res = self.collection.query(
                    query_embeddings=[query_embedding],
                    n_results=n_results,
                    where=chroma_where
                )

                if res and res.get("ids") and len(res["ids"][0]) > 0:
                    ids = res["ids"][0]
                    docs = res["documents"][0]
                    metas = res["metadatas"][0]
                    distances = res["distances"][0] if res.get("distances") else [0.0] * len(ids)

                    for i in range(len(ids)):
                        # Cosine distance to similarity score
                        sim_score = max(0.0, 1.0 - float(distances[i]))
                        results.append({
                            "id": ids[i],
                            "document": docs[i],
                            "metadata": metas[i],
                            "score": round(sim_score, 4)
                        })
                return results
            except Exception as e:
                logger.error(f"Error querying ChromaDB: {e}")

        # Fallback memory query
        if hasattr(self, "_in_memory_store"):
            for chunk_id, data in self._in_memory_store.items():
                meta = data["metadata"]
                match = True
                if where_filter:
                    for fk, fv in where_filter.items():
                        if fv is not None and meta.get(fk) != fv:
                            match = False
                            break
                if match:
                    results.append({
                        "id": chunk_id,
                        "document": data["document"],
                        "metadata": meta,
                        "score": 0.85
                    })
            results = sorted(results, key=lambda x: x["score"], reverse=True)[:n_results]

        return results

    def delete_by_document(self, document_id: str) -> None:
        if self.collection:
            try:
                self.collection.delete(where={"document_id": document_id})
                logger.info(f"Deleted chunks for document_id={document_id} from ChromaDB")
            except Exception as e:
                logger.error(f"Error deleting chunks from ChromaDB: {e}")

vector_store_service = ChromaVectorStore()
