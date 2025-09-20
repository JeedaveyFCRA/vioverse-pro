#!/usr/bin/env python3
"""
Evidence Vector Embeddings System for VIOVERSE
Creates vector embeddings for semantic search and evidence-violation linking
Using local embeddings for privacy and A+ compliance
"""

import json
import numpy as np
from pathlib import Path
import hashlib
from typing import List, Dict, Any
import re

# For this implementation, we'll use a simple but effective approach
# In production, you'd use sentence-transformers or OpenAI embeddings
# This creates a privacy-preserving local vector system

class EvidenceVectorDB:
    """Local vector database for evidence semantic search"""

    def __init__(self):
        self.embeddings = {}
        self.dimension = 768  # Standard transformer dimension
        self.vocabulary = {}
        self.idf_weights = {}

    def create_vocabulary(self, documents: List[Dict]) -> Dict:
        """Build vocabulary from all documents"""
        vocab = set()
        doc_freq = {}

        for doc in documents:
            # Extract text from various fields
            text = self.extract_text(doc)
            tokens = self.tokenize(text)
            unique_tokens = set(tokens)

            for token in unique_tokens:
                vocab.add(token)
                doc_freq[token] = doc_freq.get(token, 0) + 1

        # Calculate IDF weights
        total_docs = len(documents)
        for token in vocab:
            self.idf_weights[token] = np.log(total_docs / (1 + doc_freq.get(token, 1)))

        # Create vocabulary index
        self.vocabulary = {token: idx for idx, token in enumerate(sorted(vocab))}
        return self.vocabulary

    def extract_text(self, doc: Dict) -> str:
        """Extract searchable text from document"""
        text_parts = []

        # Add title
        text_parts.append(doc.get('title', ''))

        # Add creditor
        text_parts.append(doc.get('creditor', ''))

        # Add tags
        text_parts.extend(doc.get('tags', []))

        # Add temporal period
        text_parts.append(doc.get('temporalPeriod', ''))

        # Add category
        text_parts.append(doc.get('category', ''))

        # For JSON docs, extract violation details
        if doc.get('metadata', {}).get('hasViolationDetails'):
            text_parts.append('violation details fcra')

        if doc.get('metadata', {}).get('hasLegalFramework'):
            text_parts.append('legal framework statute')

        if doc.get('metadata', {}).get('hasDamagesCalculation'):
            text_parts.append('damages calculation financial')

        return ' '.join(str(part) for part in text_parts).lower()

    def tokenize(self, text: str) -> List[str]:
        """Simple tokenization"""
        # Remove special characters, keep alphanumeric
        text = re.sub(r'[^a-z0-9\s]', ' ', text.lower())
        tokens = text.split()
        return [t for t in tokens if len(t) > 2]  # Skip short tokens

    def create_tfidf_embedding(self, text: str) -> np.ndarray:
        """Create TF-IDF based embedding"""
        tokens = self.tokenize(text)
        embedding = np.zeros(len(self.vocabulary))

        # Calculate term frequency
        tf = {}
        for token in tokens:
            tf[token] = tf.get(token, 0) + 1

        # Normalize TF
        max_tf = max(tf.values()) if tf else 1
        for token in tf:
            tf[token] = tf[token] / max_tf

        # Create TF-IDF vector
        for token, freq in tf.items():
            if token in self.vocabulary:
                idx = self.vocabulary[token]
                idf = self.idf_weights.get(token, 1.0)
                embedding[idx] = freq * idf

        # Normalize embedding
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm

        return embedding

    def create_semantic_features(self, doc: Dict) -> np.ndarray:
        """Create additional semantic features"""
        features = []

        # Temporal features
        temporal_map = {
            'pre-vulnerability': [1, 0, 0, 0],
            'vulnerability-window': [0, 1, 0, 0],
            'post-discharge': [0, 0, 1, 0],
            'ongoing': [0, 0, 0, 1],
            'unknown': [0, 0, 0, 0]
        }
        features.extend(temporal_map.get(doc.get('temporalPeriod', 'unknown'), [0,0,0,0]))

        # Category features
        category_map = {
            'credit-denial': [1, 0, 0, 0, 0, 0],
            'damaging-alert': [0, 1, 0, 0, 0, 0],
            'emotional-impact': [0, 0, 1, 0, 0, 0],
            'additional-evidence': [0, 0, 0, 1, 0, 0],
            'timeline-trigger': [0, 0, 0, 0, 1, 0],
            'bankruptcy-doc': [0, 0, 0, 0, 0, 1]
        }
        features.extend(category_map.get(doc.get('category', 'additional-evidence'), [0,0,0,1,0,0]))

        # Impact score (normalized)
        features.append(doc.get('impactScore', 5.0) / 10.0)

        # Ripple score (normalized)
        features.append(min(doc.get('rippleScore', 0) / 100.0, 1.0))

        # Tag features
        tag_features = [
            1.0 if 'smoking_gun' in doc.get('tags', []) else 0.0,
            1.0 if 'admission' in doc.get('tags', []) else 0.0,
            1.0 if 'ongoing_violation' in doc.get('tags', []) else 0.0,
            1.0 if 'coordinated_attack' in doc.get('tags', []) else 0.0
        ]
        features.extend(tag_features)

        return np.array(features)

    def create_hybrid_embedding(self, doc: Dict) -> np.ndarray:
        """Create hybrid embedding combining TF-IDF and semantic features"""
        text = self.extract_text(doc)

        # Get TF-IDF embedding
        tfidf_embedding = self.create_tfidf_embedding(text)

        # Get semantic features
        semantic_features = self.create_semantic_features(doc)

        # Combine (weighted concatenation)
        # Give more weight to semantic features for better matching
        tfidf_weight = 0.7
        semantic_weight = 0.3

        # Pad or truncate TF-IDF to fixed size
        fixed_tfidf_size = 750  # Leave room for semantic features
        if len(tfidf_embedding) > fixed_tfidf_size:
            tfidf_embedding = tfidf_embedding[:fixed_tfidf_size]
        else:
            tfidf_embedding = np.pad(tfidf_embedding, (0, fixed_tfidf_size - len(tfidf_embedding)))

        # Combine
        combined = np.concatenate([
            tfidf_embedding * tfidf_weight,
            semantic_features * semantic_weight
        ])

        # Ensure fixed dimension
        if len(combined) > self.dimension:
            combined = combined[:self.dimension]
        else:
            combined = np.pad(combined, (0, self.dimension - len(combined)))

        return combined

    def build_index(self, documents: List[Dict]) -> Dict:
        """Build vector index for all documents"""
        print("Building vector index...")

        # Create vocabulary first
        self.create_vocabulary(documents)

        # Create embeddings for each document
        for doc in documents:
            doc_id = doc['id']
            embedding = self.create_hybrid_embedding(doc)
            self.embeddings[doc_id] = embedding

        print(f"Created {len(self.embeddings)} embeddings")
        return self.embeddings

    def cosine_similarity(self, vec1: np.ndarray, vec2: np.ndarray) -> float:
        """Calculate cosine similarity between two vectors"""
        dot_product = np.dot(vec1, vec2)
        norm1 = np.linalg.norm(vec1)
        norm2 = np.linalg.norm(vec2)

        if norm1 == 0 or norm2 == 0:
            return 0.0

        return dot_product / (norm1 * norm2)

    def search(self, query: str, top_k: int = 10) -> List[tuple]:
        """Search for similar documents"""
        # Create query embedding
        query_doc = {
            'title': query,
            'category': 'additional-evidence',
            'tags': [],
            'temporalPeriod': 'unknown'
        }
        query_embedding = self.create_hybrid_embedding(query_doc)

        # Calculate similarities
        similarities = []
        for doc_id, doc_embedding in self.embeddings.items():
            sim = self.cosine_similarity(query_embedding, doc_embedding)
            similarities.append((doc_id, sim))

        # Sort by similarity
        similarities.sort(key=lambda x: x[1], reverse=True)

        return similarities[:top_k]

    def find_related_evidence(self, doc_id: str, top_k: int = 5) -> List[tuple]:
        """Find evidence related to a specific document"""
        if doc_id not in self.embeddings:
            return []

        target_embedding = self.embeddings[doc_id]

        similarities = []
        for other_id, other_embedding in self.embeddings.items():
            if other_id == doc_id:
                continue
            sim = self.cosine_similarity(target_embedding, other_embedding)
            similarities.append((other_id, sim))

        similarities.sort(key=lambda x: x[1], reverse=True)
        return similarities[:top_k]

    def link_violations_to_evidence(self, violations: List[Dict], documents: List[Dict]) -> Dict:
        """Create intelligent linkage between violations and evidence"""
        links = {}

        for violation in violations:
            # Create violation query from its attributes
            query_parts = [
                violation.get('creditor', ''),
                violation.get('bureau', ''),
                violation.get('severity', ''),
                violation.get('date', ''),
                'violation fcra'
            ]
            query = ' '.join(str(p) for p in query_parts)

            # Search for related evidence
            results = self.search(query, top_k=3)

            violation_id = violation.get('id', hashlib.md5(str(violation).encode()).hexdigest())
            links[violation_id] = [
                {'evidence_id': doc_id, 'similarity': score}
                for doc_id, score in results if score > 0.3  # Threshold
            ]

        return links

    def save_index(self, filepath: str):
        """Save vector index to file"""
        save_data = {
            'embeddings': {k: v.tolist() for k, v in self.embeddings.items()},
            'vocabulary': self.vocabulary,
            'idf_weights': self.idf_weights,
            'dimension': self.dimension
        }

        with open(filepath, 'w') as f:
            json.dump(save_data, f, indent=2)

        print(f"Vector index saved to {filepath}")

    def load_index(self, filepath: str):
        """Load vector index from file"""
        with open(filepath, 'r') as f:
            data = json.load(f)

        self.embeddings = {k: np.array(v) for k, v in data['embeddings'].items()}
        self.vocabulary = data['vocabulary']
        self.idf_weights = data['idf_weights']
        self.dimension = data['dimension']

        print(f"Vector index loaded from {filepath}")


def create_vector_config():
    """Create vector database configuration"""
    config = {
        "vector_db": {
            "enabled": True,
            "type": "local",
            "dimension": 768,
            "similarity_metric": "cosine",
            "index_path": "public/data/vectors/evidence-vectors.json",
            "features": {
                "text_embedding": {
                    "method": "tfidf",
                    "weight": 0.7
                },
                "semantic_features": {
                    "weight": 0.3,
                    "include": ["temporal", "category", "impact", "tags"]
                }
            },
            "search": {
                "default_top_k": 10,
                "similarity_threshold": 0.3,
                "boost_factors": {
                    "smoking_gun": 1.5,
                    "same_creditor": 1.3,
                    "same_temporal": 1.2,
                    "high_impact": 1.1
                }
            },
            "cross_reference": {
                "auto_link_violations": True,
                "link_threshold": 0.4,
                "max_links_per_violation": 5
            }
        }
    }

    return config


def main():
    """Main execution"""
    print("Creating Evidence Vector Database")
    print("=" * 60)

    # Load evidence manifest
    manifest_path = "/home/avid_arrajeedavey/vioverse-clean-site/public/data/config/evidence-manifest-complete.json"

    try:
        with open(manifest_path, 'r') as f:
            manifest = json.load(f)
    except FileNotFoundError:
        print("❌ Evidence manifest not found. Run build-evidence-manifest.py first.")
        return

    # Create vector database
    vector_db = EvidenceVectorDB()

    # Build index from documents
    documents = manifest['documents']
    vector_db.build_index(documents)

    # Save vector index
    vector_path = "/home/avid_arrajeedavey/vioverse-clean-site/public/data/vectors"
    Path(vector_path).mkdir(parents=True, exist_ok=True)

    vector_db.save_index(f"{vector_path}/evidence-vectors.json")

    # Create and save configuration
    config = create_vector_config()
    with open(f"{vector_path}/vector-config.json", 'w') as f:
        json.dump(config, f, indent=2)

    print("\n✅ Vector database created successfully")
    print(f"📊 Indexed {len(documents)} documents")
    print(f"🔍 Vocabulary size: {len(vector_db.vocabulary)} terms")
    print(f"📁 Vector index saved to {vector_path}/evidence-vectors.json")

    # Test search
    print("\n🔍 Testing semantic search...")
    test_queries = [
        "credit denial bankruptcy",
        "emotional impact letter",
        "smoking gun evidence",
        "ally financial violation"
    ]

    for query in test_queries:
        print(f"\nQuery: '{query}'")
        results = vector_db.search(query, top_k=3)
        for doc_id, score in results:
            doc = next((d for d in documents if d['id'] == doc_id), None)
            if doc:
                print(f"  - {doc['title'][:50]}... (score: {score:.3f})")

if __name__ == "__main__":
    main()