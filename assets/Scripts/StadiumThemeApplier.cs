using UnityEngine;

public class StadiumThemeApplier : MonoBehaviour
{
    [Header("Theme")]
    [SerializeField] private StadiumTheme theme;

    [Header("Scene Renderers")]
    [SerializeField] private Renderer pitchRenderer;
    [SerializeField] private Renderer[] goalFrameRenderers;
    [SerializeField] private Renderer[] netRenderers;
    [SerializeField] private Renderer[] crowdRenderers;
    [SerializeField] private Renderer[] standRenderers;
    [SerializeField] private Renderer[] adBoardRenderers;

    private void Start()
    {
        if (theme == null)
        {
            Debug.LogWarning("StadiumThemeApplier: No theme assigned.");
            return;
        }

        ApplyPitch();
        ApplyGoalsAndNets();
        ApplyCrowdAndStands();
        ApplyAdBoards();
        ApplyLighting();
    }

    private void ApplyPitch()
    {
        if (pitchRenderer == null || theme.pitchMaterial == null) return;

        pitchRenderer.material = theme.pitchMaterial;

        if (theme.pitchDetailTexture != null)
        {
            pitchRenderer.material.SetTexture("_DetailAlbedoMap", theme.pitchDetailTexture);
            pitchRenderer.material.SetFloat("_DetailNormalMapScale", 1f);
        }
    }

    private void ApplyGoalsAndNets()
    {
        foreach (var r in goalFrameRenderers)
        {
            if (r != null && theme.goalFrameMaterial != null)
                r.material = theme.goalFrameMaterial;
        }

        foreach (var r in netRenderers)
        {
            if (r != null && theme.netMaterial != null)
                r.material = theme.netMaterial;
        }
    }

    private void ApplyCrowdAndStands()
    {
        foreach (var r in crowdRenderers)
        {
            if (r != null && theme.crowdMaterial != null)
                r.material = theme.crowdMaterial;
        }

        foreach (var r in standRenderers)
        {
            if (r != null && theme.standMaterial != null)
                r.material = theme.standMaterial;
        }
    }

    private void ApplyAdBoards()
    {
        foreach (var r in adBoardRenderers)
        {
            if (r != null && theme.adBoardMaterial != null)
                r.material = theme.adBoardMaterial;
        }
    }

    private void ApplyLighting()
    {
        RenderSettings.ambientLight = theme.ambientLight;

        var mainLight = RenderSettings.sun;
        if (mainLight != null)
            mainLight.color = theme.keyLightColor;
    }
}
