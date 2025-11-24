using UnityEngine;

public class PlayerVisuals2D : MonoBehaviour
{
    [SerializeField] private SpriteAnimator2D animator;
    [SerializeField] private Sprite[] runFrames;
    [SerializeField] private Sprite[] jumpFrames;
    [SerializeField] private Sprite[] slideFrames;

    public void OnRun()  => animator.Play(runFrames);
    public void OnJump() => animator.Play(jumpFrames);
    public void OnSlide()=> animator.Play(slideFrames);
}
