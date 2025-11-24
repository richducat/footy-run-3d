using UnityEngine;

[RequireComponent(typeof(Animator))]
public class PlayerVisualController : MonoBehaviour
{
    [Header("Renderers")]
    [SerializeField] private SkinnedMeshRenderer kitRenderer;
    [SerializeField] private SkinnedMeshRenderer headRenderer;

    [Header("Default Appearance (fallback)")]
    [SerializeField] private PlayerAppearanceData defaultAppearance;

    private MaterialPropertyBlock _kitMpb;
    private MaterialPropertyBlock _headMpb;
    private PlayerAppearanceData _currentAppearance;

    private static readonly int PrimaryColorId   = Shader.PropertyToID("_PrimaryColor");
    private static readonly int SecondaryColorId = Shader.PropertyToID("_SecondaryColor");
    private static readonly int FaceTexId        = Shader.PropertyToID("_FaceTex");

    private void Awake()
    {
        if (_kitMpb == null)  _kitMpb = new MaterialPropertyBlock();
        if (_headMpb == null) _headMpb = new MaterialPropertyBlock();

        ApplyAppearance(defaultAppearance);
    }

    public void ApplyAppearance(PlayerAppearanceData appearance)
    {
        if (appearance == null)
            appearance = defaultAppearance;

        _currentAppearance = appearance;

        // Apply kit colors
        if (kitRenderer != null)
        {
            kitRenderer.GetPropertyBlock(_kitMpb);
            _kitMpb.SetColor(PrimaryColorId, appearance.primaryColor);
            _kitMpb.SetColor(SecondaryColorId, appearance.secondaryColor);
            kitRenderer.SetPropertyBlock(_kitMpb);
        }

        // Apply face texture
        if (headRenderer != null && appearance.faceTexture != null)
        {
            headRenderer.GetPropertyBlock(_headMpb);
            _headMpb.SetTexture(FaceTexId, appearance.faceTexture);
            headRenderer.SetPropertyBlock(_headMpb);
        }
    }

    public PlayerAppearanceData CurrentAppearance => _currentAppearance;
}
