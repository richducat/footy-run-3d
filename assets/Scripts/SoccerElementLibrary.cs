using System;
using System.Collections.Generic;
using UnityEngine;

[Serializable]
public class ThemedObstacle
{
    public string id;       // e.g. "low_block", "high_block"
    public GameObject prefab; // new soccer-themed prefab
}

[CreateAssetMenu(
    fileName = "SoccerElementLibrary",
    menuName = "USR/Soccer Element Library",
    order = 2)]
public class SoccerElementLibrary : ScriptableObject
{
    public List<ThemedObstacle> obstacles;
    public GameObject coinPickupPrefab;
    public GameObject ballPickupPrefab;
}
