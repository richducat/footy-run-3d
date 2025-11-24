using UnityEngine;

public class GamePlayerInstaller : MonoBehaviour
{
    [SerializeField] private PlayerVisualController playerVisualController;

    private void Start()
    {
        var chosenId = PlayerPrefs.GetString("SelectedStrikerId", "striker_01");

        var appearance = PlayerAppearanceManager.Instance
            ?.GetAppearance(chosenId);

        playerVisualController.ApplyAppearance(appearance);
    }
}
