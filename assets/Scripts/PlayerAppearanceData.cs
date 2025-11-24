using UnityEngine;

[CreateAssetMenu(
    fileName = "PlayerAppearance",
    menuName = "USR/Player Appearance",
    order = 0)]
public class PlayerAppearanceData : ScriptableObject
{
    [Header("Identity")]
    public string id;               // e.g. "striker_01"
    public string displayName;      // e.g. "J. Alvarez"
    public int shirtNumber = 9;

    [Header("Kit")]
    public Color primaryColor = Color.white;   // shirt + socks main
    public Color secondaryColor = Color.blue;  // shorts or trim

    [Header("Face & Body")]
    public Texture2D faceTexture;   // realistic face (mapped in your shader)
    public Texture2D skinTexture;   // optional: full body texture

    [Header("UI")]
    public Sprite cardPortrait;     // squad card portrait sprite
}
