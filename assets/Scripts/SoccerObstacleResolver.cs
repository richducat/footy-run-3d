using System.Collections.Generic;
using UnityEngine;

public class SoccerObstacleResolver : MonoBehaviour
{
    [SerializeField] private SoccerElementLibrary library;

    private Dictionary<string, GameObject> _obstacleMap;

    private void Awake()
    {
        _obstacleMap = new Dictionary<string, GameObject>();

        if (library == null) return;

        foreach (var o in library.obstacles)
        {
            if (o != null && !string.IsNullOrEmpty(o.id) && o.prefab != null)
                _obstacleMap[o.id] = o.prefab;
        }
    }

    public GameObject Resolve(string originalId, GameObject fallbackPrefab)
    {
        if (_obstacleMap != null && _obstacleMap.TryGetValue(originalId, out var soccerPrefab))
            return soccerPrefab;

        return fallbackPrefab;
    }
}
