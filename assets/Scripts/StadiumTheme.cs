using UnityEngine;

[CreateAssetMenu(
    fileName = "StadiumTheme",
    menuName = "USR/Stadium Theme",
    order = 1)]
public class StadiumTheme : ScriptableObject
{
    [Header("Pitch")]
    public Material pitchMaterial;
    public Texture2D pitchDetailTexture; // stripes, mow pattern, etc.

    [Header("Goals & Nets")]
    public Material goalFrameMaterial;
    public Material netMaterial;

    [Header("Crowd & Stands")]
    public Material crowdMaterial;
    public Material standMaterial;

    [Header("Ad Boards")]
    public Material adBoardMaterial;

    [Header("Lighting (optional)")]
    public Color ambientLight = Color.gray;
    public Color keyLightColor = Color.white;
}
