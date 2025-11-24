using System.Collections.Generic;
using UnityEngine;

public class PlayerAppearanceManager : MonoBehaviour
{
    public static PlayerAppearanceManager Instance { get; private set; }

    [Header("Available appearances")]
    [SerializeField] private List<PlayerAppearanceData> appearances;

    private Dictionary<string, PlayerAppearanceData> _lookup;

    private void Awake()
    {
        if (Instance != null && Instance != this)
        {
            Destroy(gameObject);
            return;
        }

        Instance = this;
        DontDestroyOnLoad(gameObject);

        _lookup = new Dictionary<string, PlayerAppearanceData>();
        foreach (var app in appearances)
        {
            if (app != null && !string.IsNullOrEmpty(app.id))
                _lookup[app.id] = app;
        }
    }

    public PlayerAppearanceData GetAppearance(string id)
    {
        if (string.IsNullOrEmpty(id)) return null;
        _lookup.TryGetValue(id, out var app);
        return app;
    }
}
